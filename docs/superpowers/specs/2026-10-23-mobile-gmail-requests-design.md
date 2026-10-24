# Mobile Gmail Request Manager — implementation design

Date: 23 October 2026
Status: approved for implementation planning on 23 October 2026, following the user's approval of the mobile Requests concept and instruction to start building.

## 1. Agreed outcome

Staff receive hundreds of emails in the media department mailbox. The app identifies requests for media department support, extracts their requirements, and displays an organized request queue. Unrelated emails do not appear in the normal app experience. Staff can inspect the originating email, correct extracted details, manage preparation, and receive deadline reminders.

Confirmed by the user:
- Mobile only: native Android and iPhone application built with Expo.
- Gmail / Google Workspace is the email provider.
- The home screen lists requests across events. Equipment checklists belong inside each request.
- Visual design must be restrained, fluid, legible and appropriate for ordinary staff use.

The existing React/Vite application is a hardcoded single-event prototype. It is retained as reference; it is not the completed product.

## 2. Recommended implementation

Use Expo/React Native with TypeScript for the client, FastAPI for the API, PostgreSQL for durable application data, and Celery/Redis for Gmail synchronization, extraction and reminders. This follows the repository's mobile architecture while replacing unsupported promises with testable behavior.

Alternatives considered:
- An installable mobile website would reuse more existing code but does not match the user's confirmed native-app preference.
- A frontend-only app would be simpler but could not reliably scan email and schedule reminders while staff phones are closed. Background work belongs on the server.

Directory boundaries:
- `mobile/`: Expo app, navigation, screen components, API client, secure session storage and notification integration.
- `backend/`: FastAPI, database models and migrations, Google integration, extraction, background jobs and tests.
- `infra/`: local container configuration for PostgreSQL, Redis, API and workers.
- Existing root `src/`: legacy prototype, kept separate from production data.
- `docs/`: setup, operational guidance, architecture and validation results.

## 3. Mobile experience

### Connect and sign in

Staff sign in using their Google identity. Only explicitly permitted staff can enter the department workspace. The initial administrator is configured at deployment. The administrator authorizes the department Gmail mailbox separately; staff are not asked to share the mailbox password. A connected mailbox is an actual Gmail account authorized by its owner. Google Groups or delegated inbox arrangements require separate compatibility confirmation; membership alone is not treated as Gmail API access.

Show clear states for first setup, connecting, initial synchronization, connected, reconnect required and service unavailable. Provide a separately labeled demo environment with synthetic data; never imply that demo requests came from Gmail.

### Requests — primary screen

Compact header with the department name and last successful sync. Search and simple filters for Active, Needs review and Completed. Within Active, show deadline groups such as Overdue, Today and Upcoming. Requests without a usable date go into Needs review rather than receiving an invented deadline.

Each row contains event/request title, organizer or sender, event date, venue when known, short equipment/service summary, setup deadline, and status. Avoid equipment-level rows on this screen. Pull to refresh triggers an asynchronous sync and reports progress without blocking navigation. Show empty, loading, error and offline states.

Only confirmed request classifications appear in the request queue. Uncertain classifications appear in Needs review. Irrelevant emails are excluded from both. A settings-level recovery tool can inspect recently excluded message headers and let an administrator reclassify a missed request; this does not turn the main view into a general email inbox.

### Request detail

Event date/time, setup deadline, venue, organizer, source email and attachments. Separate Audio, Video and Other service requirements. Quantity, notes, assignment and Pending/Prepared/Tested states are individually editable. Prepared is not represented as Tested.

Staff can correct extracted fields, set priority, assign work to permitted staff, mark a request complete, reopen it, or dismiss a false positive. Changes are persisted and recorded in an activity history. Opening a row or control supports screen readers and clear focus behavior.

Original messages are displayed as sanitized plain text with sender, subject and received time. Open-in-Gmail provides a source link when available. No automatic replies, deletion or read/unread changes in Gmail.

### Changes to requests

Follow-up messages in a known Gmail thread are linked to the request. A date change, cancellation or equipment change creates a visible proposed update with old and new values. Staff accept or dismiss the proposal. Accepted updates reschedule future reminders and preserve preparation state for unchanged requirements. New requirements start Pending.

Cross-thread matches are suggestions requiring review. Multiple distinct event requests in one message can produce separate requests with shared source attribution.

### Add request, reminders and settings

A quick manual form captures hallway/phone requests, event information and equipment. Voice input uses available device dictation; no simulated speech recognition.

An agenda shows upcoming requests by event date. Reminder settings control offsets and device notifications. Settings cover staff access, mailbox status, time zone, reclassification recovery, disconnect and data deletion. Distinguish disconnecting Gmail access from deleting stored app data.

### Visual direction

Mobile layouts from 320 logical pixels upward, safe-area spacing, readable system typography, 44-point minimum interactive targets and dynamic text support. Request rows use fine separators and restrained status labels. Amber means attention, green means completed/tested, and red means unresolved overdue work. Both light and dark themes use the same hierarchy, with a user-selected dark option for backstage use. Bottom navigation: Requests, Agenda, Settings. Details use ordinary stack navigation; short edits use accessible sheets. Motion is brief and respects reduced-motion settings.

## 4. Gmail processing

Read-only Gmail OAuth scope plus identity scopes. Google refresh tokens are encrypted on the server; they never enter the mobile bundle. The client receives only application sessions. OAuth uses state, PKCE where supported, an exact configured redirect and one-time session handoff. Server-side identity verification and an administrator/staff allowlist protect workspace access.

Default initial import: the previous 30 days of incoming messages, excluding spam and trash. The administrator can request an older backfill. Paginate until the selected range is processed; never silently stop at the first page. Classify all eligible incoming messages in that range instead of using a narrow keyword query that could miss indirect requests.

After initial sync, use Gmail history IDs for incremental processing. Handle expired history with a bounded full resync. Background polling runs every two minutes while the worker is active. Manual refresh schedules the same idempotent job. Maintain a per-mailbox lock and durable message IDs to prevent duplicate processing. Persist the history checkpoint only when fetched changes are safely recorded for processing.

Rate limits, transient provider failures and worker restarts use bounded retries with backoff. Revoked authorization changes the mailbox to reconnect-required. Failed messages remain retryable and visible as a processing issue; they are not silently marked irrelevant.

## 5. Classification and extraction

Use a configurable server-side structured-output LLM integration. Production credentials and model are environment configuration; real email processing requires the operator to configure the provider. Synthetic fixtures exercise the complete pipeline without sending private data externally.

Supported classifications: media request, request update, uncertain, irrelevant. Include AV equipment, filming, photography, recording, streaming and other media support requests. An ordinary event announcement without a request for media support is not automatically a request.

Extract event name, dates/times, time zone, setup deadline, venue, organizer/contact, equipment/services, quantities, priority cues and supporting source excerpts. Validate the output against a strict schema. Missing information remains null. Relative dates are anchored to the email's received timestamp and workspace time zone. Contradictory or ambiguous dates require review. Do not invent an event time, quantity or deadline.

Treat the email and attachment text as untrusted data, never as instructions to the application or tools. AI has no authority to send mail, grant access or execute actions. Staff corrections are retained; later extraction cannot silently overwrite them.

Process text PDF and DOCX attachments with file-size, decompression, page and execution-time limits. Unsupported or scanned attachments are clearly marked as requiring manual review; OCR is an explicit future extension, not a simulated feature. Preserve attachment references and parsing status. Attachment-only requests must be considered by classification when supported text can be extracted.

Keep irrelevant message IDs and minimal classification metadata for deduplication. Do not retain their full bodies. Store relevant source content only for the configured retention period, with authenticated retrieval and no message bodies or tokens in routine logs.

## 6. Data and API boundaries

Persistent entities: staff users, workspace memberships/roles, connected mailbox, encrypted OAuth credentials, sync checkpoints, processed messages, attachment references, requests, source links, requirements, proposed updates, activity events, device registrations, reminder preferences, reminder jobs and delivery attempts.

Every operation is scoped to an authenticated workspace membership. Administrators connect mailboxes and manage staff. Staff manage requests and requirements within their workspace. Verify object ownership for each read and mutation. Use row version checks to detect conflicting edits rather than silently overwriting newer data.

API groups: authentication/session refresh/logout; workspace and members; mailbox connect/status/sync/disconnect; paginated request list/search/detail/create/update; requirements; proposed updates; source messages/attachments; device push registration; reminders/preferences; and excluded-message recovery. Input validation and error responses are shared and documented via OpenAPI.

## 7. Reminders and offline behavior

Persist reminder jobs with a uniqueness key based on request, deadline revision, offset and recipient. A background scheduler claims due jobs and records delivery attempts. Retry transient push failures, handle invalid device registrations and record provider receipts where available. Cancel future reminders when requests are completed, cancelled or rescheduled. An uncertain deadline does not trigger a fabricated reminder.

Expo push sends notifications that open the associated request. Default offsets: one day and one hour before the setup deadline; staff can configure them. Show actual permission and delivery configuration states. Operating-system delivery is not guaranteed and must never be described as fail-safe.

Cache recently opened request data for offline reading. Clearly mark stale/offline content. Do not pretend writes are synchronized while offline: show a retryable unsaved state and preserve edits until reconnection. App session credentials use secure device storage and cached workspace data is cleared on logout or access removal.

## 8. Verification and completion criteria

Automated backend and mobile tests cover:
- Relevant request, irrelevant newsletter, event announcement, ambiguous request and attachment-only request.
- Multiple events, missing fields, relative dates, contradictory dates, source fidelity and malicious embedded instructions.
- Gmail pagination, repeat sync, expired history, revoked credentials, rate limits, worker restart and retries.
- Duplicate messages, follow-up proposals, accepted reschedules, cancellations and preservation of staff corrections.
- Workspace authorization, object access isolation, OAuth state validation and token refresh/revocation.
- Prepared versus Tested, request completion/reopen, concurrent edits and manual requests.
- Reminder deduplication, changed deadlines, completed tasks, invalid push registrations and time-zone boundaries.
- Mobile navigation, filters/search, empty/loading/error/offline states, form validation, accessibility and large text.

Run type checks, builds, migrations and relevant tests. Inspect the app on mobile-sized previews and, where available, Android/iOS development builds. Document exactly which real-device checks ran. Gmail, LLM and push integrations use deterministic contract tests plus live smoke tests only after the required accounts/configuration are supplied.

A complete code deliverable includes working mobile screens, API, persistent database, jobs, real integration adapters, migrations, automated tests, a clearly separate demo, local startup configuration and deployment/setup instructions. No feature may claim success using a simulated production path.

## 9. External setup and release boundary

To connect a real mailbox and deliver native notifications, the operator must provide/configure:
- A Google Cloud project with Gmail API, OAuth consent configuration and correct clients/redirects; authorize the department mailbox.
- An explicitly configured AI provider/model and its server-side credential.
- HTTPS backend hosting, PostgreSQL, Redis, encryption/session secrets and an initial staff administrator.
- Expo project/build identifiers and Android/iOS push credentials; Apple signing account when building iOS for distribution.

These are deployment inputs, not secrets to paste into chat. Provide an example environment file and step-by-step setup instructions. Public distribution or organizational Google restrictions may require additional approval. Do not claim live integration, store publication or production deployment until each is actually verified.

## 10. References checked

- Gmail synchronization: https://developers.google.com/workspace/gmail/api/guides/sync
- Gmail history checkpoints and expired history: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
- Expo authentication and development builds: https://docs.expo.dev/guides/authentication/
- Google authentication in Expo: https://docs.expo.dev/guides/google-authentication/

## 11. Implementation assumptions

One shared department workspace with an administrator-controlled staff list, a default 30-day import window, native push reminders, and a configurable server-side LLM. These are implementation assumptions, not claims about the institution's existing policies. The accepted visual reference is the light mobile Requests inbox generated in this chat: request summaries grouped by deadline, with Requests, Agenda and Settings navigation. A matching dark theme remains in scope.
