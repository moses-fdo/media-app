# Mobile Gmail Request Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a native mobile app that turns department Gmail messages into an organized, actionable media-request queue.

**Architecture:** Expo client consumes an authenticated FastAPI API backed by PostgreSQL. Celery/Redis workers synchronize Gmail, classify and extract requests, and send scheduled Expo push notifications. Demo data and provider fakes are explicitly isolated from production integrations.

**Tech Stack:** Expo, React Native, TypeScript, Expo Router, TanStack Query, SecureStore; Python 3.12+, FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, Celery, Redis, HTTPX, cryptography; pytest and React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-23-mobile-gmail-requests-design.md`

## Global constraints

- Mobile only: native Android and iPhone application built with Expo.
- Gmail / Google Workspace is the email provider.
- The home screen lists requests across events. Equipment checklists belong inside each request.
- Default initial import: the previous 30 days of incoming messages, excluding spam and trash.
- Background polling runs every two minutes while the worker is active.
- Missing information remains null.
- Prepared is not represented as Tested.
- No automatic replies, deletion or read/unread changes in Gmail.
- Default reminder offsets: one day and one hour before the setup deadline.
- Mobile layouts from 320 logical pixels upward; 44-point minimum interactive targets.
- Bottom navigation: Requests, Agenda, Settings. Light theme matches the approved image; dark theme uses the same hierarchy.
- Preserve the legacy root Vite prototype. Put new code in `mobile/`, `backend/` and `infra/`.
- Pin compatible dependency versions and commit lockfiles after checking current official documentation during implementation. Never copy obsolete Expo version numbers from ARCHITECTURE.md.
- This folder currently has no Git repository. Do not claim commits or create a worktree without a repository. Save changes in place; commit only if Git is available at execution time.
- Account setup, deployment and real-device validation are separate verifiable milestones. Never substitute demo behavior for a working production integration.

## Review focus

1. An OAuth callback or source-message ID belonging to another workspace must not expose data (Tasks 2 and 3).
2. A Gmail history checkpoint must not advance past work lost in a worker crash (Task 4).
3. A follow-up with one changed requirement must preserve staff edits and tested state for unchanged requirements (Task 6).
4. Local-day grouping and reminder times must remain correct across midnight and time-zone changes (Tasks 7 and 9).
5. Expired sessions and offline edits must not disappear silently or show false saved success (Tasks 8 and 9).

## Contracts shared across tasks

Backend API prefix: `/api/v1`. JSON fields use snake_case. Identifiers are UUID strings except provider IDs. Dates are ISO 8601 with an explicit offset; separate `timezone` uses an IANA name. Responses use `{items, next_cursor}` for pagination and `{error: {code, message, fields}}` for expected errors.

`RequestStatus`: `needs_review | new | in_progress | confirmed | completed | cancelled | dismissed`.
`RequirementStatus`: `pending | prepared | tested`.
`Department`: `audio | video | other`.
`Classification`: `request | update | uncertain | irrelevant`.

`RequestSummary`: id, version, title, organizer, event_start, setup_deadline, timezone, venue, requirements_summary, status, priority, review_reasons.
`RequestDetail`: summary fields plus event_end, contact, requirements, sources, proposed_updates, activity.
`Requirement`: id, title, department, quantity (nullable positive integer), notes, assignee_id (nullable), status, version.

Filters: Active excludes needs_review/completed/cancelled/dismissed; Needs review includes ambiguous classification, missing required date and proposed changes; Completed includes completed/cancelled. Dismissed items are retrievable only through explicit recovery. Counters use the same server query semantics as list results.

All request writes require `expected_version`; stale writes return HTTP 409. Lists use stable cursor ordering with ID tie-breakers. Staff corrections are recorded separately from extracted proposals.

## Task 1: Persistent API foundation and local services

**Files:** `backend/pyproject.toml`, `backend/app/{main,config,database,models,schemas}.py`, `backend/alembic.ini`, `backend/migrations/`, `backend/tests/{conftest,test_foundation}.py`, `infra/compose.yaml`, `backend/Dockerfile`, `.env.example`.

**Produces:** `create_app() -> FastAPI`, `get_session() -> Iterator[Session]`, `Settings`, durable models for users/workspaces/memberships/mailboxes/messages/requests/requirements/proposals/activity/reminders/devices/session records.

- [x] Write `test_health_ready_and_migrations` asserting `/health` returns 200, readiness fails when DB is unavailable, and migrations create the required uniqueness constraints.
- [x] Run `cd backend && uv run pytest tests/test_foundation.py -q`; confirm the new test fails before implementation.
- [x] Implement configuration validation, PostgreSQL persistence and migrations. Use timezone-aware timestamps, foreign keys and uniqueness on mailbox/provider message IDs and reminder identity.
- [x] Add Compose services for PostgreSQL, Redis, API, worker and scheduler; only expose development ports on localhost by default. Define separate test database configuration.
- [x] Run migrations and the foundation tests; verify a restart retains seeded test records. Save the dependency lockfile.

## Task 2: Staff authentication and workspace permissions

**Files:** `backend/app/auth/{routes,google,sessions,permissions}.py`, `backend/app/workspaces/{routes,service}.py`, `backend/tests/test_auth.py`, `backend/tests/test_permissions.py`.

**Consumes:** Task 1 models and sessions.
**Produces:** `require_member() -> Membership`, `require_admin() -> Membership`; `/auth/start`, `/auth/callback`, `/auth/exchange`, `/auth/refresh`, `/auth/logout`, `/me`, `/workspace/members`.

- [x] Write tests asserting invalid/reused OAuth state and replayed handoff codes are rejected; unlisted Google identities receive 403; removed staff lose access; refresh-token reuse revokes the session family.
- [x] Run these tests and confirm missing-implementation failures.
- [x] Implement verified Google identity exchange, expiring state records, PKCE binding and one-time mobile session handoff. App refresh tokens are hashed, rotating and revocable. Google token exchange stays server-side.
- [x] Implement administrator bootstrap and staff allowlist with role checks; normalize identity using verified provider subject rather than trusting client email fields.
- [x] Run auth and permission tests, including ID tampering across two workspaces. Ensure all private routes use membership dependencies.

## Task 3: Request management API

**Files:** `backend/app/requests/{routes,service,queries}.py`, `backend/app/sources/routes.py`, `backend/tests/test_requests.py`, `backend/tests/test_sources.py`.

**Produces:** `GET/POST /requests`, `GET/PATCH /requests/{id}`, requirement CRUD, `GET /requests/{id}/activity`, authenticated source retrieval and staff assignment. Query parameters: `tab`, `q`, `department`, `priority`, `cursor`, `limit` (maximum 100).

- [x] Write tests for tab membership, stable pagination, title/sender search, create/edit/complete/reopen, distinct prepared/tested states, 409 on stale versions, and 404 for a source in another workspace.
- [x] Run `uv run pytest tests/test_requests.py tests/test_sources.py -q` and confirm failures.
- [x] Implement the shared contracts and validation. Require explicit time zones for date edits, preserve nulls, validate assignees, and record actor/before/after changes in activity.
- [x] Implement authenticated plaintext source views and attachment metadata. No raw HTML rendering. Add configurable source retention and a purge operation that does not destroy request details.
- [x] Run request/source tests against PostgreSQL, including two simultaneous updates to the same version.

## Task 4: Gmail connection and durable synchronization

**Files:** `backend/app/gmail/{client,oauth,sync,mime,routes}.py`, `backend/app/jobs/{celery_app,sync}.py`, `backend/tests/test_gmail.py`, `backend/tests/fixtures/gmail/`.

**Produces:** `GmailClient.list_messages(...)`, `get_message(message_id)`, `list_history(start_history_id, page_token)`, `get_attachment(message_id, attachment_id)`; `/mailbox/status`, `/mailbox/connect`, `/mailbox/sync`, `/mailbox/backfill`, `/mailbox/disconnect`; `sync_mailbox(mailbox_id)` job.

- [x] Write fixture-driven tests for paginated initial import, paginated history, repeat delivery, revoked tokens, 429 retry, expired history, a crash after recording a message and before checkpoint commit, and excluding sent-only/spam/trash mail.
- [x] Confirm tests fail, then implement encrypted Gmail refresh-token storage using a configured encryption key, token refresh and revocation. Reject mailbox connect/disconnect from non-admins.
- [x] Implement a 30-day initial import, durable ingestion records and history processing with a per-mailbox lock. Enqueue durable processing work before advancing checkpoints; a retry must yield one request per extracted event, not duplicates.
- [x] Implement two-minute scheduled sync and asynchronous manual sync. Report last successful sync, queued/failed message counts and reconnect-required status honestly.
- [x] Run Gmail tests and worker restart recovery tests. No credentials or email bodies in logs.

## Task 5: Classification, extraction and attachment processing

**Files:** `backend/app/extraction/{schemas,prompts,provider,attachments,service}.py`, `backend/app/jobs/extract.py`, `backend/tests/test_extraction.py`, `backend/tests/test_attachments.py`, `backend/tests/fixtures/extraction/`.

**Produces:** `analyze_message(message: MessageInput) -> AnalysisResult` through an injectable `ExtractionProvider`; `AnalysisResult` contains classification, list of extracted events, source excerpts and review reasons. `extract_attachment(data: bytes, mime_type: str) -> AttachmentResult`.

- [x] Write fixtures asserting a newsletter yields no request, an explicit AV request yields equipment quantities, an event announcement is irrelevant, missing dates stay null, and malicious instructions cannot change the allowed schema/actions.
- [x] Add tests for multiple events, unsupported/scanned attachments, attachment-only text requests, contradictory dates, MIME HTML fallback and quoted replies.
- [x] Confirm failures, then implement strict schema validation and a configurable structured-output provider. Check current official provider docs at implementation time. Never use a keyword-only heuristic as a disguised production AI service.
- [x] Implement bounded PDF/DOCX parsing: maximum 10 MB input, 50 PDF pages, 50 MB expanded DOCX content, 30-second subprocess timeout and maximum 100,000 extracted characters. Report truncation/unsupported content for review.
- [x] Store source attribution and classification metadata, discard irrelevant bodies, and make transient/invalid provider responses retryable. Add privacy/processing disclosure during mailbox setup.
- [x] Run extraction and attachment tests. Keep a separately named optional live-provider smoke command; do not run with real private messages without authorization.

## Task 6: Staff review and follow-up changes

**Files:** `backend/app/requests/{review,matching}.py`, `backend/app/jobs/extract.py`, `backend/tests/test_review.py`.

**Produces:** `/requests/{id}/review`, `/requests/{id}/proposals/{proposal_id}/accept`, `/dismiss`, `/mailbox/excluded`, `/mailbox/excluded/{message_id}/reprocess`; `apply_proposal(request_id, proposal_id, expected_version, actor_id)`.

- [x] Write tests that uncertain requests enter Needs review, same-thread changes produce proposals, cross-thread matches require confirmation, and accepting one new equipment item preserves existing tested states and manual corrections.
- [x] Add tests that accepted cancellation cancels reminders and ignored email recovery fetches/processes only the selected message.
- [x] Confirm failures, then implement proposal diffs and version checks; extraction must never silently overwrite staff-maintained fields.
- [x] Implement administrator-only excluded-header recovery with pagination and retention bounds. Present failed processing separately from irrelevant classification.
- [x] Run review tests, including two proposals accepted from the same stale base version.

## Task 7: Persistent reminders and push delivery

**Files:** `backend/app/reminders/{routes,scheduler,delivery}.py`, `backend/app/jobs/reminders.py`, `backend/tests/test_reminders.py`.

**Produces:** `/devices`, `/reminder-preferences`, `/reminders`; `schedule_request_reminders(request_id)`, `deliver_due_reminders(now)`, `collect_push_receipts()`.

- [x] Write tests asserting default offsets equal `[1440, 60]` minutes, repeated scheduling produces one job per identity, complete/cancel/reschedule invalidates future jobs, and ambiguous dates produce no fabricated alarm.
- [x] Add time-zone/midnight cases, worker claim races, transient delivery errors, invalid tokens and receipt failures.
- [x] Confirm failures, then implement durable claim/delivery state and bounded retries through Expo push, including deep-link data `{request_id}`. Document the remaining possibility of duplicate delivery after an ambiguous network timeout; do not promise exactly-once external delivery.
- [x] Expose delivery status and preferences without implying guaranteed OS notification delivery.
- [x] Run reminder tests and scheduler restart tests using a fake clock and provider.

## Task 8: Expo shell, secure sessions and approved visual system

**Files:** `mobile/package.json`, `mobile/app.config.ts`, `mobile/app/{_layout,index,sign-in}.tsx`, `mobile/src/{theme,components,api,auth}/`, `mobile/tests/session.test.tsx`, `mobile/tests/navigation.test.tsx`.

**Produces:** typed `ApiClient`, `SessionProvider`, theme tokens, accessible Button/Input/Screen/Sheet/StatusLabel components and authenticated routes.

- [x] Initialize a current compatible Expo TypeScript project after reading current Expo installation/authentication documentation. Pin dependencies and add mobile test/typecheck scripts.
- [x] Write failing tests for sign-in/restore/logout, expired refresh returning to sign-in, cleared cache on access loss, and rejected OAuth callbacks with mismatched state.
- [x] Implement secure session persistence, Google browser auth handoff, request cancellation and one refresh attempt shared across concurrent 401 responses.
- [x] Implement the approved warm-white/charcoal/blue design with dark equivalents, system type, dynamic text, safe areas, minimum 44-point targets, reduced-motion support and three bottom tabs.
- [x] Run `npm run typecheck`, `npm test -- --runInBand` and `npx expo-doctor`; resolve dependency mismatches. Do not claim native auth works in Expo Go when a development build is required.

## Task 9: Requests inbox, details, agenda and offline states

**Files:** `mobile/app/(tabs)/{_layout,index,agenda}.tsx`, `mobile/app/requests/{[id],new}.tsx`, `mobile/src/features/requests/`, `mobile/src/features/agenda/`, `mobile/tests/{requests,detail,agenda,offline}.test.tsx`.

**Consumes:** Tasks 3/6 APIs, Task 8 client and components.
**Produces:** actual connected screens matching the approved request-inbox concept.

- [x] Write tests for Active/Needs review/Completed, search, deadline grouping in workspace time zone, null-date review handling, pagination and pull-to-refresh progress/errors.
- [x] Write detail tests for edit validation, manual creation, prepared/tested distinction, source navigation, accept/dismiss update, assignment, complete/reopen and stale version conflict.
- [x] Confirm failures, then implement list/detail/agenda navigation and forms. Home rows summarize requests; equipment is visible only in details. Make Gmail deep links optional and safe to open.
- [x] Implement explicit offline cache state, preserved unsaved forms and retry after reconnection. Namespace cache by workspace and session; clear on logout. Never display a successful save before the server accepts it.
- [x] Run all four test suites plus typecheck; inspect 320/390/430-width layouts, large text and light/dark themes in one bounded visual pass. Fix the findings in one batch and verify once more.

## Task 10: Settings, notifications and service configuration

**Files:** `mobile/app/(tabs)/settings.tsx`, `mobile/app/settings/{mailbox,staff,reminders,excluded}.tsx`, `mobile/src/features/settings/`, `mobile/src/notifications/`, `mobile/tests/settings.test.tsx`.

- [x] Write tests for admin-only mailbox/staff controls, reconnect state, denied notification permission, saved reminder preferences, request deep links, disconnected mailbox state and recovery reclassification.
- [x] Confirm failures, then implement connection setup and status, staff management, theme/time zone, reminder offsets, push registration and logout.
- [x] Implement explicit, distinct confirmation flows for revoking mailbox access and deleting stored workspace data. Enforce corresponding server permissions; do not delete actual Gmail messages.
- [x] Run settings tests and verify denied permissions leave the app usable. Test push on a development build only when credentials and a physical device are available; otherwise document it as unverified.

## Task 11: Demo, full-flow checks and release handoff

**Files:** `backend/app/demo.py`, `backend/tests/test_end_to_end.py`, `mobile/src/demo/`, `README.md`, `docs/{SETUP,DEPLOYMENT,VALIDATION}.md`, `mobile/eas.json`, CI configuration if a Git repository is present.

- [x] Create isolated synthetic demo data showing a request, an ambiguous date, irrelevant messages, a follow-up and a completed event. Demo startup must be explicitly enabled and visibly labeled; production startup rejects demo auth configuration.
- [x] Add an end-to-end test: ingest a synthetic Gmail fixture through extraction, show the request, edit requirements, accept a reschedule, complete the request, verify reminder cancellation and persistence after API restart.
- [x] Add missing-key setup states and verify they produce actionable configuration errors rather than fake connected/success messages.
- [x] Run full backend tests, mobile tests/typecheck, migration upgrade on a clean PostgreSQL instance, Expo export and supported build checks. Record command outcomes and environment limitations.
- [x] Document Google consent/client setup, provider configuration, server secrets, Compose startup, HTTPS deployment, worker scheduling, backups, retention, Expo development/release builds and device notification setup. Keep secrets out of examples and source control.
- [x] Review the entire change for authorization leaks, lost/duplicate requests, inconsistent mobile states and spec coverage. Address actionable findings and rerun only affected checks.
- [x] Report completed code separately from live Gmail, real-provider extraction, physical-device push and store release. List any remaining external configuration precisely.

## Execution recommendation

Implement natively in this chat, task by task, then perform an independent final review. The API contracts and ingestion states are tightly coupled, so one implementation context reduces coordination cost. Subagent-driven execution is also available if the user prefers an independent review gate after every task.

Plan review is required by the writing-plans workflow before product-code implementation. No implementation task above is marked complete merely because its design has been written.
