# Production hardening — 24 October 2026

The application has a tested release candidate. Local verification does not replace live Gmail/OAuth consent, physical-device push delivery, production signing or deployment verification.

## Fixed workflows

- The actual in-app email template is covered by a regression test. Explicit dates/times, quantities, organizer, contact and venue are parsed without interpreting email text as commands.
- Missing event times remain unknown. Invalid dates/times and quantities become review items instead of crashing. A suggested setup deadline is flagged for confirmation.
- Recognizable casual requests are preserved for staff review; relative dates are not guessed. A mailing-list footer no longer overrides an otherwise valid request.
- Parsed PDF/DOCX text supplies event fields. Conflicting body/attachment values require review. Unsupported, scanned, oversized or truncated content remains manual review. The parser child has Linux memory/CPU limits; text and attachment sizes are bounded.
- Quoted replies do not silently override current fields. Date-only/time-only replies reuse known schedule components. Venue-only replies preserve dates and equipment. Omitted email fields never mean delete.
- Email equipment updates retain unmentioned items and unchanged preparation/assignment. Changed equipment returns to Pending. Staff can add, edit, remove and assign equipment in the request form.
- Proposed changes display old/new values, equipment quantities and a source-email action. Newer conflicting manual edits are protected. Acceptance/dismissal and direct edits use optimistic versions.
- Two workers processing the same message produce one proposal; verified with real PostgreSQL row locks.
- New requests await explicit confirmation. Reminders run only for Confirmed or In progress requests. Pending email proposals must be resolved before confirmation/completion. Completed, cancelled, dismissed and review items do not send future reminders.
- Cancellation is explicit staff action. Email text cannot automatically cancel or reopen an event. Startup no longer deletes requests based on their title or equipment count.

## Runtime hardening

OAuth app redirects are restricted to configured app URLs/origins. PKCE, nonce, single-use handoff, Gmail read-only permission and encrypted refresh-token behavior are tested with a simulated Google provider. Production configuration rejects demo mode, SQLite, missing Google credentials, invalid encryption keys, unsafe CORS and request-process background fallbacks.

API authentication and request limits use shared Redis counters. Request bodies are bounded. Production requires migrations and Redis readiness. API/worker/scheduler containers run as UID 10001. API binding is loopback-only in Compose so a reverse proxy can provide HTTPS.

Synchronization failures remain visible. Queue outages return 503 rather than pretending a durable job was queued. Backfill checkpoints reset under the worker lock. Failed extraction retries are bounded; explicit Sync can retry exhausted messages. Interrupted reminder claims can recover, and invalid push devices are disabled. Push delivery is at least once across a crash after submission; it is not an exactly-once guarantee.

Web sessions migrate to tab-scoped storage. Offline caches are isolated by workspace, expire after 24 hours and cannot populate a different signed-in workspace after a delayed read. Cold-start access requires loading the current staff profile. Staff removal revokes sessions/devices; reauthorization cannot revive old sessions. Sign-out also disables server-side push devices when the server is reachable.

The native Copy action now writes to the clipboard; Share remains separate. API timeouts, non-JSON proxy failures, workspace-load failures and stale editing conflicts have recovery paths.

## Verification

- 91 backend tests passed, including real PostgreSQL/Redis/Celery integration, concurrent extraction and the real PDF/DOCX parser subprocesses.
- 29 mobile tests passed across 11 suites; TypeScript passed. An open edit retains its original version even if background synchronization refreshes the request.
- A production-mode Docker API, worker and Beat scheduler ran locally. Verified health/readiness 200, unauthenticated API 401, demo endpoint 404, authenticated API success, non-root UID and scheduled tasks reaching the worker.
- Expo single-page web export and SDK dependency compatibility check passed. Protected routes use explicit sign-in/workspace redirects, with the navigator mounted during session loading. Browser checks use synthetic fixtures; they do not exercise live Google or push services.
- Python dependency audits found no known vulnerabilities in the installed Windows environment or the Linux container virtual environment. These are dependency audits, not a complete operating-system security certification.
- Native Android build/signature results are recorded in RELEASE-READINESS.md.

## Dependency findings

Removed the unused local EAS CLI dependency and applied compatible npm fixes. The audit fell from 24 findings to 5 high-severity package reports, all in the Expo tooling chain, rooted in node-forge and Zod. node-forge 1.4.0 remains the registry version available during this check; Expo CLI uses Zod 3. A forced Expo downgrade or an untested Zod major override was not applied.

These findings require an explicit release review/upstream fix. The CI uploads the audit report and does not describe the dependency tree as clean. They were not observed as application-source imports, and that is not a blanket claim that build tooling is risk-free.

References: [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Expo clipboard API](https://docs.expo.dev/versions/latest/sdk/clipboard/).

## Remaining release gates

1. Configure the real HTTPS deployment, approved frontend origin, Google callback/consent and department mailbox. Run a real template, casual request, attachment, follow-up, reconnect and excluded-message recovery through that deployment.
2. Deploy migration 002, one scheduler and the workers. Verify backups by restoring a copy, monitor readiness/queue failures and test a restart. Do not reuse any example password or encryption key.
3. Provide the private release keystore/FCM configuration, then test login, background reminders, notification taps, logout and the installed logo on physical Android devices. iOS signing/APNs/device validation requires its own release environment.
4. Resolve or explicitly assess the remaining upstream build-tool advisories before publication. CI has been added locally; it has not been run on GitHub in this chat.

No existing hosted API, Gmail account, push service or app-store release was modified by these local checks.
