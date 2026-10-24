# SDD ledger — plan: docs/superpowers/plans/2026-10-23-mobile-gmail-requests.md
Execution: native, user approved 2026-10-23.
Ruling: no Git repository exists; work in place and retain this ledger instead of git-based task scripts/commits. Cost: no automatic commit rollback.
Ruling: Docker/PostgreSQL unavailable locally; use SQLite for fast contract tests plus ship PostgreSQL Compose/migrations. PostgreSQL-specific validation remains explicitly unverified until runtime available.
Pre-flight: Tasks 1→2→3 share session/model contracts; consistent. Tasks 3→4→5→6 share source/request contracts; consistent. Tasks 3/6→7 share versioned request state; reminder revision must increment on accepted date changes. Tasks 2/3/6/7→8/9/10 share snake_case API and workspace scoping; consistent.
Baseline: root npm run build passed.

Task Completion Ledger:
- Task 1: Persistent API foundation and local services — COMPLETED (schemas, SQLite/PG database models, migrations, Docker Compose configuration, health and readiness checks).
- Task 2: Staff authentication and workspace permissions — COMPLETED (OAuth state validation, PKCE exchange, rotating sessions, workspace role enforcement).
- Task 3: Request management API — COMPLETED (tab filtering, pagination, optimistic locking, source sanitization, audit trail, workspace data purge).
- Task 4: Gmail connection and durable synchronization — COMPLETED (30-day initial import, incremental history checkpoints, token encryption, deduplication).
- Task 5: Classification, extraction and attachment processing — COMPLETED (strict Pydantic schemas, bounding attachment limits, discard irrelevant bodies).
- Task 6: Staff review and follow-up changes — COMPLETED (proposal diff merge, preservation of tested status and staff manual edits).
- Task 7: Persistent reminders and push delivery — COMPLETED (idempotent scheduling, offset preferences, cancellation on completion, push registration).
- Task 8: Expo shell, secure sessions and approved visual system — COMPLETED (SecureStore tokens, Google OAuth browser handoff, light/dark themes, accessible components).
- Task 9: Requests inbox, details, agenda and offline states — COMPLETED (active/review/completed tabs, search, timezone-aware day grouping, gear management, stale-edit handling).
- Task 10: Settings, notifications and service configuration — COMPLETED (mailbox status/connect/disconnect, staff allowlist, reminder preferences, excluded email recovery, push registration helper, settings unit tests).
- Task 11: Demo, full-flow checks and release handoff — COMPLETED (synthetic demo mode, test_end_to_end.py, mobile/src/demo/, mobile/eas.json, SETUP.md, DEPLOYMENT.md, VALIDATION.md, README.md).

Test Checkpoint:
- Backend: 21 passing automated pytest tests in backend/tests/.
- Mobile: 5 passing test suites (8 tests) in mobile/tests/, 0 TypeScript errors on tsc --noEmit.
- Root: Legacy prototype build passed.
