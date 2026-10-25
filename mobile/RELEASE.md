# Android release and local APK builds

The app is Expo / React Native. Run commands from `D:\Projects\GitHub\media-app\mobile` in PowerShell.

## Physical Android phone build

The default Windows build targets the live HTTPS API at `https://media-desk-api.onrender.com`, with demo disabled:

```powershell
.\scripts\build-android.ps1
```

On Linux, install locked dependencies with `npm ci`, then run:

```sh
./scripts/build-android.sh
```

Set `ANDROID_HOME` if the SDK is outside `~/Android/Sdk`.

Install the newly built `android/app/build/outputs/apk/release/app-release.apk` on the phone. This APK runs without Metro or a computer-hosted backend. An older installed APK keeps its old API address until replaced. Use your approved staff Google account; the Android OAuth return URI is `mediaops://auth`.

This is a directly installable, debug-signed internal build. Store publication still requires the private production signing configuration below. Verify a complete Google sign-in, mailbox connection and notification delivery on the actual phone before distribution.

## Prerequisites

Install Node.js LTS, Android Studio, and its Android SDK platform, build tools, platform tools, NDK and CMake versions requested by Gradle. Use Android Studio's bundled Java 21 runtime. The build script selects it automatically. It also finds the shared SDK at `D:\Android\Sdk` (the `Android\Sdk` directory on the project drive) before considering environment variables, which avoids stale terminal values and Codex/MSIX AppData redirection.

With Android Studio already installed, the project installer downloads the official command-line tools, verifies Google's archive checksum, installs the required SDK/NDK/CMake packages and saves user environment variables:

```powershell
.\scripts\install-android-dependencies.ps1
```

The installer defaults to the shared SDK directory on the project drive. The build helper discovers it immediately; reopening the terminal is unnecessary. To use another SDK location, pass `-SdkRoot 'C:\your-sdk-directory'` to the installer and build helper.

```powershell
cd D:\Projects\GitHub\media-app\mobile
$env:ANDROID_HOME = 'D:\Android\Sdk'
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
```

To verify SDK/Java detection without installing packages or starting Gradle:

```powershell
.\scripts\build-android.ps1 -ApiUrl 'http://10.0.2.2:8000' -CheckOnly
```

## Build an installable preview APK locally on Windows

For local backend testing, start the backend separately. An Android emulator reaches the host computer at `10.0.2.2`; a physical phone needs the computer's LAN IP and a backend listening on `0.0.0.0` with the firewall configured. `localhost` on the phone means the phone itself.

```powershell
.\scripts\build-android.ps1 -ApiUrl 'http://10.0.2.2:8000'
```

This installs locked dependencies when necessary, runs TypeScript and mobile tests, updates native icon/splash resources using Expo prebuild, and runs `gradlew.bat :app:assembleRelease`. A successful install is stamped with the lockfile's SHA-256 hash; subsequent builds reuse it while the lockfile and required tools are unchanged. It fixes stale Linux SDK paths. Output:

```text
D:\Projects\GitHub\media-app\mobile\android\app\build\outputs\apk\release\app-release.apk
```

The preview APK bundles JavaScript and runs without Metro. It uses debug signing and demo is disabled by default, so it is for internal testing. Install it with:

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r .\android\app\build\outputs\apk\release\app-release.apk
```

If npm reports `EPERM` while unlinking a native `.node` file, close this project's Expo/Metro preview before retrying. Windows can lock native modules while a preview is running. A failed `npm ci` may leave `node_modules` incomplete, so rerun the regular build command to restore dependencies. Use `-Reinstall` to force a fresh locked install; `-SkipInstall` is only for an already complete installation.

The helper also gives Java a short project-local socket directory through `JAVA_TOOL_OPTIONS`. This avoids `Unable to establish loopback connection` / `UnixDomainSockets.connect` failures caused by Windows/MSIX temporary-directory redirection. The setting applies to Gradle and its Java/Kotlin subprocesses.

Gradle runs on Android Studio's Java 21. React Native's build plugin separately requests a Java 17 compiler toolchain, which Gradle downloads automatically on the first build. That initial toolchain download and Maven dependency resolution can take several minutes before native compilation prints task output.

The installer and build helper also update bundled Ninja versions older than 1.12 to official Ninja 1.13.2, verifying the download's SHA-256. Original SDK binaries are preserved beside their replacements as `ninja.exe.sdk-original`. Android's bundled Ninja 1.10.2 fails on Reanimated's long Windows paths even with Windows long-path support enabled. See [Reanimated's Windows build guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/).

## Build a signed production APK locally

Deploy the backend over HTTPS first. Configure real Google OAuth, read-only Gmail access, PostgreSQL, Redis/Celery, Expo FCM credentials and staff access. Verify the external-service checks in `docs/RELEASE-READINESS.md` before distribution.

Generate and back up a private upload keystore outside the repository. `keytool` asks for its passwords interactively:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.android\media-ops" | Out-Null
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore "$env:USERPROFILE\.android\media-ops\upload.keystore" -alias media-ops -keyalg RSA -keysize 2048 -validity 10000
$env:MEDIAOPS_KEYSTORE_PATH = "$env:USERPROFILE\.android\media-ops\upload.keystore"
$env:MEDIAOPS_KEY_ALIAS = 'media-ops'
$env:MEDIAOPS_KEYSTORE_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Keystore password' -AsSecureString)).Password
$env:MEDIAOPS_KEY_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Key password (same for PKCS12)' -AsSecureString)).Password
.\scripts\build-android.ps1 -Production -ApiUrl 'https://YOUR-DEPLOYED-API-HOST'
```

Replace the API placeholder. The production configuration rejects HTTP, localhost and demo mode. The native plugin reads signing secrets from the environment and replaces Expo's debug release signing. Passwords are not written into project files. Back up the keystore; keep secrets outside source control. A preview installed with a different signing key must be uninstalled before installing the signed APK (uninstall removes local app data).

For a Google Play App Bundle after the production prebuild, run:

```powershell
Push-Location android
.\gradlew.bat :app:bundleRelease --no-daemon
Pop-Location
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`. Google Play uses AAB for submission. APK is for direct installation. Ensure the app identifier belongs to your organization before first publication, set a unique Android versionCode for each upload, and complete privacy/data-safety/store listing requirements. Publishing has not been performed.

## Branding

`assets/images/karunya-k-mark.png` is the Karunya mark. `karunya-k-icon.png` is the opaque launcher icon. `app.config.js` configures the Android adaptive and monochrome icons, iOS icon, web favicon and native splash. Expo Go and web preview cannot verify the native release splash; verify it by cold-launching a release APK on a device.

Sources: [Expo local builds](https://docs.expo.dev/guides/local-app-overview/), [APK builds](https://docs.expo.dev/build-reference/apk/), [Splash screen](https://docs.expo.dev/versions/latest/sdk/splash-screen/).


## Latest internal phone package — 25 October 2026

Version 1.1.0 (2) is available at `../build/karunya-media-desk-1.1.0.apk`. The stable phone APK path also points to it. It includes the intro, Gmail sync setup, widget and UI improvements. See `../docs/PHONE-BUILD.md` for verification, checksum and physical-phone checks still pending. It uses the prior internal debug certificate and is not a store-signed distribution.

## Required Firebase configuration for the next Android build

The 1.1.0 APK exposed missing Firebase initialization when enabling notifications. Android phone builds now require google-services.json for `com.mediaops.staff`, provided at the mobile root or through GOOGLE_SERVICES_JSON. Expo's FCM V1 sender credentials must also be configured privately before delivery can work. See `../docs/ANDROID-PUSH-SETUP.md`. The source has clearer configuration errors and cold-start sign-in handling; these are not yet in a replacement APK.

## Editorial Desk package — 25 October 2026

Version **1.1.1 (3)** is at `../build/karunya-media-desk-1.1.1.apk` and the stable phone APK path. It includes the latest Editorial Desk UI and configured Firebase resources. Build, package and signature checks passed; see `../docs/PHONE-BUILD.md`. No hardware install or push delivery was verified.
