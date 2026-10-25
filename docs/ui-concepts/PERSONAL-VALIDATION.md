# Personal Gmail account flow — 25 October 2026

## Behavior

Sign in once with Google and grant read-only Gmail access. A private workspace is owned by the verified Google subject, and the inbox from that same account is connected. New personal accounts open Requests directly and use automatic sync. Connection recovery, optional setup, reminders, excluded email recovery and imported-data controls are available in Settings. User-facing role badges, team management, shared-inbox setup and equipment assignment controls are removed. No private person's name or email is hardcoded in product copy.

Existing shared records stay in their original workspace. At first personal sign-in, membership moves to a private workspace without copying shared data or tokens. Old sessions, devices, reminder jobs and OAuth handoffs are retired. Access/refresh/exchange validate private ownership, and workers skip old non-personal mailboxes. Stable Google subjects preserve a personal workspace when its email changes. The mobile app refuses legacy/shared profile responses before opening event screens.

## Validation

- Backend: 123 tests passed; one optional external-service integration skipped.
- Mobile: 78 tests passed across 25 suites; TypeScript passed.
- Regression coverage includes two-user event/mailbox isolation, missing Gmail scope/refresh token, mismatched reconnect, old-session rejection, preserved shared rows, blocked shared background processing, stable identity after email changes, ownership migration from schema 002 to 003, optional setup and the legacy-server profile gate.
- Security review found a legacy background-sync path, now guarded by the common mailbox ownership check; the reviewer verified the fix and found no remaining material findings in the reviewed additions.
- Synthetic browser walkthrough confirmed direct entry after sign-in and simplified settings. The preview does not contact real Gmail. Captures: personal-sign-in-web-390.png and personal-settings-web-390.png.

The backend image runs Alembic before API startup; readiness requires revision 003. Personal mode defaults on outside test environments and is explicitly available as PERSONAL_ACCOUNTS=true. The API, worker and scheduler need the same setting.

The hosted backend has not been deployed by this work. Real Google consent, phone installation, background message delivery, native UI and notification delivery are not established by the browser/test results. The current APK needs the matching backend deployment.
