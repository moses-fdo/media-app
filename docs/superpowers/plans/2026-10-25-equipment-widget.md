# Equipment and Upcoming Events Implementation Plan

**Goal:** Refine the approved UI, show equipment as text, and add the Android home-screen widget without producing an APK.

**Architecture:** An extracted equipment component and refined request rows reuse the current theme. A local Expo Android module stores minimal credential-free snapshots and renders a native widget; a root sync component publishes authenticated agenda results and clears data on session changes.

**Spec:** `docs/superpowers/specs/2026-10-25-equipment-widget-design.md`

## Constraints

- Preserve existing uncommitted work and functioning login; work in the current feature checkout.
- No APK assembly or replacement. Keep schema compatibility for equipment.
- Snapshot expires after 24 hours; native redraw every 30 minutes; publish up to 50 entries and display at most three.

## Tasks

- [x] 1. Add failing behavioral tests for equipment text and upcoming selection/pagination. Implement the shared components/model and refine request hierarchy, date/venue and equipment copy.
- [x] 2. Add the local Android module, widget resources, deep links, privacy/expiry handling and native selection tests. Verify autolinking, then compile/test only the library and resources.
- [x] 3. Add root widget synchronization, race-safe session clearing and optional widget setup in Settings. Test authentication/session transitions and refresh failures.
- [x] 4. Run typecheck and full mobile tests; inspect source, run Impeccable detector once; document verified results, phone-preview limitations and that APK is unchanged.

## Review focus

Late requests after logout must not republish old events. Pagination must not omit the nearest event due to setup-deadline ordering. Missing/invalid times must not be guessed. Large text and compact widget sizes must not clip event content. Native changes must survive clean Expo regeneration through a tracked local module.

## Verification record

TypeScript and 39 tests across 15 mobile suites passed. The local widget module compiled and all four native unit tests passed; release resources validated. Expo autolinking resolves the tracked local module. A reviewer identified cold-start widget-link loss; a queued routing component and regression test address it, and the final bounded review reported no remaining actionable findings.

The existing APK checksum is unchanged. Native launcher appearance/pinning/device checks remain intentionally deferred until a later user-requested build. Local web previews were inspected with synthetic events in light/dark mode; these are not Android screenshots.
