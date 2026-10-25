# Media Desk release readiness — 25 October 2026

This is a locally tested release candidate. It has not been deployed or published. Live Gmail consent, physical-device push delivery and private release signing remain release gates.

## Delivered

The mail/template/review workflow now preserves omitted information, surfaces ambiguous dates and quantities, displays proposed changes before acceptance and protects concurrent staff edits. Equipment can be added, edited, assigned and removed. Reminders wait for explicit confirmation; interrupted delivery claims and failed extraction have recovery paths.

Production configuration, OAuth redirects, request limits, shared Redis rate limits, session revocation, migrations, queue failures and non-root containers are guarded. The deterministic parser handles supported text/PDF/DOCX requests; it does not require an AI provider. See [production hardening](PRODUCTION-HARDENING.md) for implementation and limits.

The app uses the new Karunya K identity across the launcher and interface. Requests, review details, equipment editing, calendar Agenda and supporting screens use the selected design. Selecting an Agenda date shows that day's events. Protected web routes recover through sign-in and profile loading; the web build is a single-page application.

## Verification

| Check | Result |
| --- | --- |
| Backend | 91 tests passed, including real PostgreSQL/Redis/Celery integration, concurrent extraction and actual PDF/DOCX subprocess parsing |
| Mobile | TypeScript passed; 29 tests passed across 11 suites, including stale edits during background refresh |
| Production-mode containers | API, worker and scheduler ran locally; health/readiness 200, unauthenticated API 401, demo endpoint 404, authenticated API success, UID 10001 and scheduled worker execution verified |
| Web | Expo SPA export passed; anonymous deep links reach sign-in, authenticated fixture opens Requests; review acceptance, equipment editing and narrow-screen layout checked in the actual Expo app |
| Dependency compatibility | Expo SDK dependency check passed |
| Python dependency audit | No known vulnerabilities reported in Windows and Linux application environments |
| npm dependency audit | Five high-severity package reports remain in the Expo tooling chain, rooted in two upstream advisories; publication gate |
| Native Android | Final preview APK built successfully on 25 October; APK v2 signature verified; packaged Hermes bundle matches the latest source. Physical-device and production-key validation remain open |
| GitHub CI | Workflow added locally; not run on GitHub in this chat |

Browser fixtures use synthetic mail/profile data. API integration tests use isolated local services and a simulated Google provider. Neither establishes live Google access or real push delivery. One upstream Starlette TestClient deprecation warning remains in backend tests.

## Android preview

The Windows build helper produces `mobile/android/app/build/outputs/apk/release/app-release.apk`. This preview uses Android debug signing, demo enabled and the emulator API origin `http://10.0.2.2:8000`; it is for internal testing with a local backend. It is not the store artifact or a build configured for the hosted production API.

Final verification on 25 October: Gradle `assembleRelease` succeeded, APK archive integrity passed, and `apksigner verify --verbose --print-certs` verified the Android Debug certificate using APK Signature Scheme v2. The 108,546,644-byte APK identifies as `com.mediaops.staff`, version 1.0.0 (1), label Karunya Media Desk, with arm64-v8a, armeabi-v7a, x86 and x86_64 libraries. Source-map inspection confirms the final edit-version fix, and the packaged Hermes bundle exactly matches that verified output. No device was connected for an installed-app test.

SHA-256: `1a9bf508fa6fb74e9abde9e3df621498fb8760e3d2d2f5a85d30e9ffeca796dc`.

The shared SDK is `D:/Android/Sdk`, with Android Studio Java 21. The build helper includes the Windows cross-drive Kotlin and Java socket workarounds. Native compilation emits upstream deprecation warnings. See [mobile release instructions](../mobile/RELEASE.md) for private signing and production API configuration.

## Before launch

1. Deploy the HTTPS API/frontend with migration 002, PostgreSQL, Redis, workers and one scheduler. Verify a backup restore, restart recovery, readiness and queue monitoring. Follow [deployment instructions](DEPLOYMENT.md).
2. Configure real Google OAuth consent, approved callbacks and the department mailbox. Run actual template, informal request, attachment, follow-up, review, exclusion recovery and reconnect cases through the deployment.
3. Configure the private upload key and FCM/APNs as appropriate. Test login, offline recovery, reminders, notification taps, logout and the installed icon on physical devices. iOS needs its own signing/build environment.
4. Resolve or explicitly assess the remaining Expo tooling advisories. Do not force an Expo SDK downgrade or a Zod major override to obtain an artificially clean audit.
5. Complete privacy/support/retention information, any required Google verification, store declarations and an internal testing rollout before public publication.

The remaining npm reports concern [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) and [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Compatible fixes and removal of unused EAS CLI reduced the initial 24 reports to five. These are build-tool dependencies; they still require review before release.

Older VALIDATION.md and UI-only reports are historical snapshots. No existing hosted API, Gmail account, push service or app-store release was modified by these checks.
