# Equipment and upcoming-events widget — 25 October 2026

## Delivered source

- Request details list quantity × equipment and notes as text, grouped by department. Preparation-state controls and related copy are removed from the user interface. The backend equipment schema remains compatible.
- Request rows prioritize the event title, full date/time and venue, then quieter organizer/equipment details. Edited touch paths use 48dp controls and consistent light/dark theme tokens.
- Settings → Home-screen widget provides a current-events preview, Android pin request and manual launcher instructions. Web can preview it but cannot pin an Android widget.
- The native widget uses the existing identity and palette, emphasizes the first of three upcoming events and shows the successful sync time. Compact/enlarged-font variants reduce the displayed count for legibility.
- Android redraws saved data periodically, without storing credentials or fetching Gmail itself. The app publishes a complete, paginated event feed while active. Started events drop off; terminal/invalid/undated events are excluded; snapshots older than 24 hours hide event details.
- Minimal snapshots live in Android no-backup storage. Logout clears them. Publishing generations reject delayed old-account results. Cold-start widget destinations are held until session and staff-profile restoration complete.

## Verification

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Mobile tests | 39 passed across 15 suites |
| Widget native tests | 4 passed, zero failures/errors |
| Native library/resources | Debug Kotlin compilation and release-resource validation passed |
| Expo autolinking | Resolves upcoming-events and UpcomingEventsModule |
| UI preview | Requests/detail/equipment and widget setup inspected in the actual Expo web renderer with synthetic fixtures; light and dark widget previews saved below |
| Code review | Cold-start link issue fixed and regression-tested; final bounded review had no remaining actionable findings |
| APK | No APK generated or replaced |

Native verification command, run with the local Android SDK configured:

```sh
cd mobile/android
./gradlew :upcoming-events:testDebugUnitTest :upcoming-events:verifyReleaseResources --no-daemon --max-workers=2
```

This compiles/tests the Android library and validates resources; it does not assemble the application.

## Preview evidence and limitations

[Light web preview](widget-setup-web-light.png), [dark web preview](widget-setup-web-dark.png). Data is synthetic. The screenshot shows the in-app setup preview, not an Android launcher capture.

Per the user's instruction, no native app was built or installed. Actual launcher placement, pin confirmation, device typography/resizing, live widget taps and notification/device behavior need a later native build and device check. Unit tests prove selection/routing logic, not Android launcher rendering. Existing Gradle/Expo dependency deprecation warnings remain.

The previously delivered `build/karunya-media-desk-phone.apk` is unchanged: SHA-256 `2d7ea634fea969786c8b3a4c7ec75f28870311a522defd81e5f9182a55a51eb3`. These new source changes will not appear in that APK.
