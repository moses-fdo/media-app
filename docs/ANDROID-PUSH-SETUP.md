# Android push setup

The 1.1.0 internal APK cannot enable Android push because Firebase was not configured when it was built. This is distinct from staff Google sign-in and connecting the department Gmail account.

## Required account setup

1. Create a Firebase project in the Firebase console. Register an Android app with the exact package name `com.mediaops.staff`.
2. Download that Android app's **google-services.json**. Place it at `mobile/google-services.json`, or set `GOOGLE_SERVICES_JSON` to the file's absolute path in the build environment. This Android configuration is included in the APK; it is not a service-account private key.
3. Enable the Firebase Cloud Messaging API and configure an FCM V1 service-account credential privately in the existing Expo project's Android credentials. It must belong to the same Firebase project as google-services.json. The Expo project ID already in app.json must remain unchanged. Never include the service-account key in the APK or EXPO_PUBLIC variables.
4. Rebuild with the normal Android phone build script, install the updated APK, enable notifications, and test an actual due reminder and its delivery receipt with the app closed.

Official instructions: https://docs.expo.dev/push-notifications/fcm-credentials/

## Source safeguards now implemented

- App configuration reads/validates the Firebase Android registration, rejects a mismatched package or incomplete file, and passes android.googleServicesFile to Expo prebuild.
- Phone APK build scripts require Firebase configuration. EAS Android builds have the same guard. Web development remains usable without Firebase.
- Android registration checks the packaged configuration before permission/token registration. An unconfigured build explains that reminder timing can still be saved; raw Firebase initialization errors are replaced with this actionable message.
- Existing Expo project settings are preserved. Successful registration still obtains the real Expo token and registers it with the backend.

TypeScript and 73 tests across 24 suites pass, including configuration validation and notification registration. Firebase account setup and live notification delivery are not complete. No replacement APK was built without the required Firebase file.

## Separate sign-in timeout

The reported timeout occurs before Google opens. The hosted health, readiness and OAuth-start endpoints responded successfully when checked warm. A prior cold health request exceeded the ordinary 20-second timeout. Google-opening endpoints now allow 90 seconds, with waiting copy on sign-in; ordinary API writes keep the 20-second timeout and are not automatically retried. Regression tests cover a 30-second OAuth start and the unchanged ordinary write timeout. These source changes require the next APK and have not been verified on a phone.
