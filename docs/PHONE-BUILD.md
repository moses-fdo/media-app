# Physical Android phone build — 25 October 2026

Latest installable internal-testing APK: `build/karunya-media-desk-1.1.0.apk` (also available as `build/karunya-media-desk-phone.apk`).

- Package `com.mediaops.staff`, version **1.1.0 (2)**. Minimum Android API 24, target API 36. ARM64 and 32-bit ARM libraries.
- Includes intro/Gmail setup, upcoming-events home-screen widget and the approved UI/accessibility/recovery improvements. Details: [Phone UI validation](ui-concepts/PHONE-UI-VALIDATION.md).
- Unused UI helpers/imports and expo-image/expo-auth-session dependencies removed. TypeScript rejects unused code.
- TypeScript and **66 mobile tests across 22 suites passed**. **4 native widget tests passed**, zero failures/errors. Final Gradle assembleRelease succeeded after the final source changes.
- APK archive integrity and v2 signature verified. Uses the **same Android Debug signing certificate** as the previous internal APK, with an incremented version code. This is an internal installation build; store publication requires private release signing.
- Hosted API bundled: `https://media-desk-api.onrender.com`. Bundled JavaScript contains neither the local preview/emulator API address nor the demo-login endpoint. Latest sync-completion and native picker code verified in the packaged bundle.
- Packaged manifest enables predictive Back, default orientation and keyboard resizing, and registers the home-screen widget receiver/resources.
- Hosted API `/health` returned HTTP 200 with status ok. No physical phone is connected: actual Google/Gmail consent, TalkBack, system font scaling, native picker/keyboard/Back behaviour, notification delivery and launcher widget placement/resizing/taps still need phone validation.
- Five existing high-severity npm dependency findings remain. This build does not establish public-launch readiness.

Size: **53,178,642 bytes** (50.7 MiB). SHA-256: `f155d14c21653e4555660ab19e4d8b4cc268667668eb5bb034db2e7c30f2a3ac`.

Transfer the APK to the phone and open it. Android may ask you to allow installation from that source. Install over the previous same-signed app to preserve its local data. No Metro server or local backend is required. Use an authorized staff Google account.

Previous internal APK archived as `build/karunya-media-desk-1.0.0.apk`.

## Previous build record


Installable internal-testing APK: `build/karunya-media-desk-phone.apk`.

- API bundled in the APK: `https://media-desk-api.onrender.com`.
- Demo sign-in removed from the interface and authentication client. The packaged bundle contains neither the demo-login endpoint nor the emulator API address.
- ARM64 and 32-bit ARM libraries; minimum Android API 24.
- Package `com.mediaops.staff`, version 1.0.0 (1).
- Gradle assembleRelease succeeded. TypeScript and all 29 tests across 11 suites passed.
- APK archive integrity and APK v2 signature verified. Signed with Android Debug for direct internal installation; public store signing remains outstanding.
- Hosted API readiness and Android OAuth-start endpoint responded successfully; the returned Google callback uses the hosted HTTPS API.
- No physical phone was connected. Complete Google login, Gmail consent, notification delivery and notification taps remain to be checked on a phone.
- Five npm high-severity dependency findings remain; this build does not establish public-launch readiness.

Size: 55,421,165 bytes. SHA-256: `2d7ea634fea969786c8b3a4c7ec75f28870311a522defd81e5f9182a55a51eb3`.

Transfer the APK to the phone, open it and allow installation from that source when Android prompts. No Metro server or local computer backend is required. Open the app and choose Continue with Google using an authorized staff account. If Android refuses an update because the older app has a different signing certificate, uninstalling the older app permits installation but removes its local app data.

Rebuild instructions: [Android release guide](../mobile/RELEASE.md). The previous APK documented in RELEASE-READINESS.md used an emulator API address; this phone build supersedes it for physical-device testing.
