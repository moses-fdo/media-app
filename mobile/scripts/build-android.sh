#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://media-desk-api.onrender.com}"
export EXPO_PUBLIC_DEMO_ENABLED=false
export REQUIRE_ANDROID_PUSH=true
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
node -e 'const u=new URL(process.env.EXPO_PUBLIC_API_URL); if(u.protocol!=="https:" || ["localhost","127.0.0.1","::1","[::1]"].includes(u.hostname) || u.pathname!=="/" || u.search || u.hash || u.username || u.password) throw Error("A physical-phone build requires a public HTTPS API origin")'
if [[ ! -x "$ANDROID_HOME/platform-tools/adb" ]]; then
  echo "Android SDK not found at $ANDROID_HOME; set ANDROID_HOME." >&2
  exit 1
fi
npm run check:release
npx expo prebuild --platform android --no-install
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew :app:assembleRelease --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a,armeabi-v7a)
echo "APK: $PWD/android/app/build/outputs/apk/release/app-release.apk"
echo 'Internal phone build; debug signing. Store publication requires private release signing.'
