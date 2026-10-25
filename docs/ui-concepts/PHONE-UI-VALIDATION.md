# Phone UI improvements — 25 October 2026

## Implemented

- Native Android/iOS date/time pickers from the existing Expo UI module; browser-native controls on web. Picker components preserve wall-clock values for workspace-time-zone conversion.
- Inline title, schedule and equipment validation, invalid-state semantics, announcements and scroll recovery.
- Shared 48dp targets, including equipment, staff and template actions. Adaptive scheduling/equipment rows, calendar cells and tab height; landscape enabled and Android keyboard resize configured.
- Appearance defaults to System, persists Light/Dark/System and ignores stale hydration after a user changes the selection. Input outlines have stronger contrast. Shared press and sync motion observes Remove animations.
- Requests highlights the next future event and pending review count. Maintains title/date/venue hierarchy. Active filters remain visible when collapsed and have a reset. Empty lists offer appropriate next actions.
- Compact sync timestamps, role-aware connection recovery, honest queued/completed feedback, retry and offline saved-data messages. Gmail dispatch failures do not prevent request reads from refreshing.
- Per-account/workspace/request local drafts, seven-day expiry, explicit resume/discard, autosave and background flush. Original request versions remain attached to edits. Logout clears drafts and fences late writes. Back offers Keep editing, Save draft and leave, or Discard. Conflict reload removes the obsolete draft and suppresses pending autosave.
- Removed unused shared Card/StatusBadge/style exports, unused imports and unused expo-image/expo-auth-session dependencies. Required router/native dependencies retained. TypeScript now rejects unused locals and parameters.

## Evidence

TypeScript and 66 mobile tests across 22 suites pass, including picker wall-clock handling, appearance restart, inline errors, draft interruption/account isolation/logout fencing, Back choices, conflict draft deletion, filters, review/next-event routing and refresh during queue failure. Existing API tests cover expired sessions and network failures. Read-only review findings were addressed, including guarding a pending autosave from recreating discarded data. Four native widget tests also pass, and the final release APK builds successfully.

Local synthetic web walkthrough confirmed inline error scroll recovery, draft leave/resume/discard, and appearance persistence. Screenshots: final-requests-web-dark.png, final-requests-web-light.png, final-form-web-dark.png. These are desktop web fixtures, not Android screenshots.

Measured token contrast ratios: light body/background 15.95:1, secondary/background 5.25:1, secondary/subtle surface 5.07:1, accent/soft 5.09:1, primary button text 5.74:1; dark equivalents 15.72:1, 8.75:1, 7.44:1, 7.02:1 and 9.63:1. Error and warning text on their soft surfaces exceed 5.3:1 in both schemes.

Hosted API /health returned HTTP 200 with status ok. No physical phone is connected. TalkBack traversal, actual native picker/keyboard/Back gestures, large system text, landscape, real Google/Gmail consent, notification delivery and resized launcher widgets require device validation. Source and automated checks do not establish those results.

APK packaging/signature details are recorded in ../PHONE-BUILD.md after build verification.
