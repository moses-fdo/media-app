# Karunya Media Desk — Studio Production Desk

Approved on 24 October 2026 from the generated Requests, Agenda, Details and Settings previews. This governs the Expo app in `mobile/`; the repository-root cue-sheet concept is legacy.

Mode: Operate. Staff scan incoming requests, prepare equipment, and review email changes. Preserve real roles, source emails, proposed updates, manual edits, reminder confirmation, dismissal and completion.

## Visual language

Warm paper #F8F8F5, charcoal #171C2B, cobalt #345CD7, restrained amber deadlines, red overdue/errors, and green completed work. Native sans typography: 36px page headings, 32px detail titles, 22px list titles, 14–16px body, 11–13px supporting labels. Use full-width flat rows, fine dividers, 20px gutters, 720px maximum content width and 44px minimum control targets. Avoid decorative cards, large category tiles, floating sync controls, and equipment paragraphs in colored boxes. Dark mode uses the shared theme with equivalent hierarchy.

## Identity

The geometric split-stem K in `assets/images/karunya-k.svg` is the vector master. `src/components/Brand.tsx` draws the same geometry using theme colors. Use this identity consistently in headers, sign-in, launcher, splash and favicon. Native adaptive icons have their own mask-safe transparent foreground and monochrome silhouette.

## Screens

- Requests: K wordmark/avatar, title and New action, honest mailbox/demo status and inline refresh, search/filter controls, underlined Active/Review/Done tabs. Event rows give the title full width, then venue/time, organizer, a two-line equipment summary and a separated deadline line. Keep counts and pagination functional.
- Agenda: wordmark, title/Today, Monday-first month calendar, event dots, filled selected day and outlined current day. Tap a day to update the time-column event list below. Month arrows retain the selected day number where valid. Group events by workspace time zone, not device or UTC date; sort by actual time. Unscheduled requests link back to Requests. Empty dates offer a date-prefilled new request. Preserve offline/loading/error behavior.
- Details: readable title, organizer, flat venue/date metadata, amber deadline strip (red when overdue), department equipment listed as quantity × item text with supporting notes, without preparation-state controls, source email actions and anchored primary action. Preserve proposal accept/dismiss and existing lifecycle actions.
- Settings: identity, flat grouped Workspace/Preferences/Account rows, real role and mailbox state. Expand Appearance to Light/Dark/System options. Show the actual workspace time zone and reminder values. Admin-only recovery and deletion remain protected.
- Supporting pages: consistent width, gutters, typography and form controls; flat lists for staff, reminders and excluded emails. New request receives the Agenda date when supplied. Keep template copy/share and source attachments functional.

## Verification references

Actual implementation screenshots are in `../docs/ui-concepts/redesign-*.png`. These use synthetic preview data. They are visual evidence, not proof of live Gmail or native platform integration.

## Approved refinement — 25 October 2026

Request rows prioritize event titles, then full date/time and venue. Organizer and equipment summaries are quieter. Edited interactive paths use 48dp minimum targets. Equipment details are plain text; unknown quantities remain explicit.

The Android home-screen widget extends this system with a compact Upcoming events header, one larger event and two following events. It uses the same paper/charcoal/cobalt values and follows the device light/dark mode. A compact or enlarged-font widget shows one event to preserve legibility. Events open their requests after session/profile restoration. Footer timestamps describe the last successful app sync; there is no background mailbox fetch. After 24 hours the widget hides saved events and prompts a refresh.

Settings includes a live upcoming-events preview and a launcher pin request, with manual setup instructions when pinning is unavailable. Web shows the preview with native setup disabled. No APK is generated in this iteration.

## Intro setup

Use one focused step per screen, a 560dp content width, flat explanatory rows, a persistent skip action and a labelled five-step progress indicator. Match the paper/charcoal/cobalt system. Distinguish queued sync, mailbox reading, request processing, completion and recovery without invented percentages. Keep optional notification and widget actions explicit. Static widget previews must not imply navigation.

## Phone usability refinement

Use descriptive section headings in forms, native date/time controls and a stronger semantic input outline. Date/time and equipment rows stack on narrow screens or enlarged text. Calendar days retain at least 48dp width with horizontal scrolling when necessary; enlarge calendar cells and tab bars with text scale. Reduce-motion users receive immediate press feedback. Destructive draft choices use an accessible cross-platform dialog; saved drafts always preserve the original edit version. Routine sync timestamps stay quiet; recovery actions are prominent.

## Editorial Desk refinement — 25 October 2026

The selected Editorial Desk Requests/detail direction and matching Agenda comp refine the existing paper/charcoal/cobalt system. Keep its palette, split-stem K, flat rows, shared theme and responsive safeguards. The wordmark now uses readable mixed-case text beside the existing mark.

Requests keeps the next-event preview compact so search, Active/Review/Done tabs and event rows receive priority. Titles remain dominant; organizer and equipment text align with the metadata text rather than its icons. Selected tab counts use a restrained accent tint. Review retains search and department filters.

Agenda shares the Requests avatar/settings header, adds an outlined Today control, and strengthens the selected date, event dots and time-column hierarchy. Event rows use a cobalt rule, readable venue/organizer metadata and a chevron. The list-footer New request action uses the selected date even when that day already has events. Below 360px or with enlarged text, event time stacks above its details; the calendar remains horizontally scrollable when needed.

Details uses a larger title, quiet organizer/location/date metadata, a plain Edit action and a ruled deadline row with semantic deadline text. Equipment and anchored lifecycle actions remain intact. Bottom navigation labels are slightly larger.

Current documentation drift: the earlier 32px detail-title and amber-strip description above predates this refinement; the implemented title is 34px and the deadline row has a transparent background. These are local screen refinements, not new global tokens. The existing document structure and design sidecar have not been normalized or regenerated. See `../docs/ui-concepts/EDITORIAL-VALIDATION.md` for evidence and limits.

## Personal account interface

Keep the Editorial Desk visual language. Settings shows the signed-in profile without role badges or shared-workspace labels. Use Your Gmail, Gmail connection, Excluded emails and Delete imported data. Remove team-directory navigation and equipment assignment selectors. Sign-in explains private read-only Gmail access. First-time personal accounts open Requests directly; optional setup uses personal copy and offers Gmail recovery to the account owner.
