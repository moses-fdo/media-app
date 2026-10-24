# Media Ops release readiness — 24 October 2026

This is a release candidate, not a published or certified error-free production service. Passing local/demo tests does not verify Gmail, AI extraction, FCM/APNs delivery, hosted workers or physical-device behavior.

## Changes in this pass

- Applied the selected Paper & Cobalt UI to the Expo mobile request list, details, navigation and shared controls, with matching supporting screens.
- Added a generated cobalt M/request-sheet logo, opaque launcher icon, Android adaptive icon and native light/dark splash configuration. Original assets remain available. Built-in image generation was used; source prompts are recorded in the branding notes.
- Clear cached workspace requests on sign-out/session expiry, preserve native Text props on shared labels, expose notification-registration failures and configure the Android notification channel/Expo project ID.
- Handle reminder notification taps by opening their request, including cold launches after sign-in.
- Added release configuration guards for public HTTPS API and demo-disabled production builds. Production native signing reads a private keystore from environment variables instead of falling back to Expo's debug key.
- Added a Windows local APK helper and documented preview, production signing and AAB commands in `mobile/RELEASE.md`.
- Fixed SQLite in-memory connections so tables remain available across request threads; this matters for isolated local smoke testing.
- Updated six Expo packages to the SDK's recommended compatible patch versions. Disabled optional web route splitting so local previews load the small app together instead of pausing on each first screen visit.

## Publication gates

1. Deploy HTTPS API, PostgreSQL migrations, Redis, Celery workers and one Beat scheduler. Verify health, readiness, backups/restoration and worker processing. Put authentication rate limiting and request size limits at the reverse proxy; the API does not currently implement distributed rate limiting.
2. Supply and verify Google OAuth client/redirect/consent, actual staff access, department Gmail consent, encryption key and configured AI provider. Smoke-test a real request, ambiguous dates, follow-up proposal, supported attachment and reconnect flow. No real-service credentials were supplied or used in this pass.
3. Verify ownership of `com.mediaops.staff` and the EAS project ID in `mobile/app.json`. Configure Android FCM credentials and iOS APNs/signing if shipping iPhone. Test notification permission, background delivery, tapping alerts, logout and revocation on physical devices.
4. Build with the private production signing key and cold-launch on a real device. Verify native splash, adaptive icon, Android back navigation, keyboard, offline handling and larger system text. A preview APK has now compiled successfully and its debug signature verifies; physical-device and production-key verification remain required.
5. Resolve or explicitly assess the dependency audit findings below before publication. Do not run `npm audit fix --force`: it proposes changing the Expo SDK major version, which can break native compatibility.
6. Complete privacy policy, support URL, retention policy, Google OAuth verification where required, Play Data Safety/store listing, screenshots and release versionCode. Preserve the upload key and perform an internal testing rollout before public publication.

## Dependency audit

The installed Expo CLI chain reports `node-forge@1.4.0` (GHSA-86w9-cpqp-85rv) and `zod@3.25.76` (GHSA-mrhx-c7xc-m3w5). Registry inspection during this pass reports node-forge 1.4.0 as latest and Expo CLI 58.1.15 as latest. A forced override to Zod 4 would replace a major-version API used by Expo CLI. These findings are documented rather than hidden or addressed through an untested SDK downgrade. They are build-tool dependencies, but a release decision must still assess them. Check current registry/advisories again before release.

References: [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Expo local build overview](https://docs.expo.dev/guides/local-app-overview/), [Expo splash screen release testing](https://docs.expo.dev/versions/latest/sdk/splash-screen/).

## Verification results

| Check | Result |
| --- | --- |
| Backend `uv run --frozen pytest -q` | 22 passed; one upstream Starlette TestClient deprecation warning |
| Mobile `npm run check:release` | TypeScript passed; 7 suites / 12 tests passed, runner exits normally |
| Expo `install --check` | Dependencies up to date after compatible patch updates |
| Android `expo export --platform android` | Passed; 5.7 MB Hermes bundle plus assets in `mobile/dist-android` |
| Expo Android prebuild | Passed for preview and production configuration; generated light/dark splash resources |
| Production signing plugin | Generated Gradle selects `signingConfigs.release` and environment-based keystore values |
| PowerShell APK helper | Syntax passed; required SDK/JDK paths are now installed and configured |
| UI detector | No findings on changed request list, row and detail targets |
| Windows Android toolchain | Installed SDK Platform 37.0, Build Tools 37.0.0, Platform Tools 37.0.1, NDK 27.1.12297006, CMake 3.22.1/3.30.5 and Gradle 9.4.1; verified Java 21, ADB, apksigner, CMake and Clang execution |
| Native preview APK | Windows PowerShell 5.1 helper completed `:app:assembleRelease`; 109,338,916-byte universal APK; `apksigner verify --verbose --print-certs` passed APK Signature Scheme v2 with the Android Debug certificate |
| Physical-device / production-key verification | Not run; preview includes demo mode and emulator API origin `http://10.0.2.2:8000` |
| Live Gmail, AI provider and push | Not run: external credentials/services not configured for this pass |
| Dependency audit | Unresolved upstream advisories remain; publication gate |

Browser smoke testing uses the actual Expo web rendering and an isolated synthetic demo backend, not a handcrafted HTML replacement. Verified login, request search, Needs review filtering, requirement state mutation, source viewing, completion, reopening, Agenda, Settings, dark appearance and sign-out. Verified saved workspace-cache entries fell from 2 to 0 on sign-out. Inspected the request list/detail at 390 pixels and source at 320 pixels. Fixed an invalid raw text node in the source view and adjusted bottom navigation height for labels. Real Android and iPhone device checks remain required.

The older `VALIDATION.md` is a historical report from 23 October and does not by itself establish current release readiness. No app has been published in this pass.

SDK path correction: the original AppData installation was redirected into Codex/MSIX app storage. The complete SDK was copied to the shared `D:\Android\Sdk` directory. The build helper now discovers that directory before stale environment values and supports explicit `-SdkRoot` and `-CheckOnly`. Verified the dependency check in Windows PowerShell 5.1 with intentionally invalid SDK and Java environment paths; it resolved the shared SDK and Android Studio Java 21 and ran ADB/Java successfully.

Local build follow-up: stopped the project's Expo preview that held Lightning CSS's native module open, restored dependencies with `npm ci`, and added lockfile-hash-based reuse so routine builds do not delete a working installation. Added the project-local Java socket directory workaround. Updated SDK-bundled Ninja 1.10.2 to checksum-verified official Ninja 1.13.2, preserving original binaries, after reproducing Reanimated's Windows long-path compilation failure. The subsequent complete native preview build succeeded and APK signature verification passed. Output: `mobile/android/app/build/outputs/apk/release/app-release.apk`. Native compilation still emits upstream deprecation warnings; the result does not establish error-free runtime behavior or production readiness.
