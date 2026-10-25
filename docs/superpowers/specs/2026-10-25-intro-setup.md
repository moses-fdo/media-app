# Intro setup with Gmail and first sync

Approved flow: welcome and working Google sign-in, department Gmail connection, first sync, reminders/optional notifications, optional Android widget. Preserve Karunya styling and do not build an APK.

The existing sign-in page remains the signed-out welcome. After login, guide each account through a short welcome and four practical setup steps. Persist the current step and completion on this device per workspace/member. Resume after OAuth or a restart; allow setup to be completed later; provide Replay setup in Settings. Standard staff see the shared mailbox and administrator instructions rather than a connection button. Connecting requests read-only Gmail consent through the existing flow.

First sync posts to the existing queue and polls mailbox status. Describe waiting, reading, queued extraction, failures, reconnect and completion using actual fields, with no fake percentage. A previously successful timestamp cannot complete a new sync attempt. An updated sync timestamp plus no queued extraction proves completion; partial/unknown extraction states must be labeled honestly. Allow retries or continuing later. Offer existing successful shared sync to returning staff rather than forcing another import.

Save actual reminder preferences, request notification permission only on explicit action, and offer widget pinning or manual instructions. Optional steps may be skipped. Onboarding must not erase pending widget/notification destinations: replay them only after setup completes. OAuth callbacks and profile loading remain accessible while setup is pending.

Verify pure progress logic and saved-state validation, account isolation/resumption, staff/admin controls, sync queue/failure paths, optional completion and replay, and deferred deep-link routing. Run TypeScript/mobile tests and web previews with synthetic fixtures. No APK or live Gmail authorization is performed by these checks.
