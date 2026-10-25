# Template-only email intake — 25 October 2026

## Intake policy

New events require a subject starting with `[MEDIA REQUEST]` followed by the event name (case-insensitive; Re/Fw/Fwd prefixes are supported). Recognized template fields must contain organizer/department, venue, date, event time, setup deadline, and at least one audio/video/other equipment section with a value. The field aliases already accepted by the shared parser remain supported.

The template can be in the current email body or a successfully parsed attachment. Quoted previous messages do not qualify a new email. Merely mentioning microphones, recording, media support or an event is insufficient. A subject tag without the template is insufficient. An unreadable attachment cannot promote an unrelated email into Review. Manual reprocessing runs the same policy and cannot bypass it.

Malformed dates/quantities or conflicting attachment fields inside a matching template remain reviewable. Structured partial replies may update an existing request only when linked by Gmail thread and the tagged media-request subject; they cannot create a second event.

## Existing queue cleanup

The next mailbox sync reversibly changes non-template legacy imports from needs_review to dismissed, with a versioned audit entry. It only applies to automatic email records in that mailbox with no staff edits/activity. Valid template sources, staff-created/edited records, confirmed/in-progress/completed requests and tagged records whose source expired are preserved. Pending reminders are cancelled for dismissed records. Policy-excluded records cannot absorb later valid templates in the same thread. No original Gmail message is deleted and no request row is physically deleted.

## Validation and rollout

96 backend tests pass; one external PostgreSQL/Redis integration test is skipped because isolated service test URLs are not configured. New regressions cover keyword newsletters, tag-only messages, attachment bypass, recovery bypass, valid templates/parsed attachments and conservative existing-queue cleanup. Existing linked-update and manual-edit protection tests still pass.

Deploy the updated API and worker source, then run a normal mailbox sync. The phone uses the backend policy without an APK update. This local source change has not yet been deployed to the hosted Render service, and no live mailbox data has been modified from this workspace.
