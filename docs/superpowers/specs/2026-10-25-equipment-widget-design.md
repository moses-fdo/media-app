# Equipment, UI refinement and Android widget

Approved in chat: simple equipment text; stronger event/date/venue hierarchy; native home-screen upcoming-events widget; matching light/dark styling. No APK build.

## Existing screens

Retain the Karunya identity, flat rows, familiar navigation, existing request editing and lifecycle. Equipment groups use text rows (`4 × Wireless microphone`) and optional notes, with honest unknown quantities. Remove preparation controls and explanatory preparation copy, keeping server schema compatibility. Put event titles first in request rows, show full event dates and times, and quiet organizer/equipment supporting text. Keep touch controls at least 48dp on edited paths.

## Widget

Implement a local Android Expo module, registered by autolinking. Use platform RemoteViews with a light/dark palette and a resizable layout: Upcoming events header, a larger first event, two smaller following events and last-updated footer. Each row opens its request via `mediaops:///requests/{id}`. Empty/signed-out/stale states open Agenda or sign-in.

The app loads all agenda pages, filters future valid event starts, excludes terminal states, sorts by actual timestamps and publishes a minimal snapshot of up to 50 upcoming entries. Android selects three at draw time so past starts fall off while the app is closed. Periodic redraw is Android-managed, at most every 30 minutes, and is not a background mailbox fetch. Display the successful snapshot time, never a failed refresh time. After 24 hours hide saved event details and ask to open the app. Logout, account/workspace changes and revoked authentication clear saved widget contents. Cache contains no contact, equipment, Gmail data or credentials and is excluded from backup.

Widget installation requires a later native app build. This task may compile/test the Android library and resources, but must not assemble/package an APK or modify the previously delivered APK.

## Verification

Behavioral tests cover text equipment, valid upcoming selection, unknown/invalid dates, terminal states, pagination, stale/cleared snapshots, logout and late responses. Native unit tests cover time filtering, sort, expiry and row limits. Compile native module/resources without app packaging. Typecheck, mobile suite and one Impeccable detector pass. Native visual screenshots require a later installed build; report that limit instead of substituting web screenshots as device proof.
