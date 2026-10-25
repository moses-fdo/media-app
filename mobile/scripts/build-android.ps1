param(
    [string]$ApiUrl = 'https://media-desk-api.onrender.com',
    [switch]$Production,
    [switch]$EnableDemo,
    [switch]$SkipInstall,
    [switch]$Reinstall,
    [string]$SdkRoot,
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$env:REQUIRE_ANDROID_PUSH = "true"
$mobileRoot = Split-Path $PSScriptRoot -Parent
Push-Location $mobileRoot
try {
    $uri = [Uri]$ApiUrl
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -notin @('http', 'https')) { throw 'ApiUrl must be a full HTTP(S) API origin.' }
    if ($uri.AbsolutePath -ne '/' -or $uri.Query -or $uri.Fragment) { throw 'Use the API origin without /api/v1, a query, or a fragment.' }
    if ($Production -and ($uri.Scheme -ne 'https' -or $uri.IsLoopback)) { throw 'Production requires your deployed public HTTPS API origin.' }
    $studioJdk = 'C:\Program Files\Android\Android Studio\jbr'
    if (Test-Path -LiteralPath "$studioJdk\bin\java.exe") { $env:JAVA_HOME = $studioJdk }
    if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath "$env:JAVA_HOME\bin\java.exe")) { throw 'Set JAVA_HOME to Android Studio JBR or JDK 17/21.' }
    # Prefer a shared location outside MSIX-redirected AppData and stale terminal settings.
    $sharedSdk = Join-Path ([IO.Path]::GetPathRoot($mobileRoot)) 'Android\Sdk'
    $sdkCandidates = if ($SdkRoot) { @($SdkRoot) } else {
        @($sharedSdk, $env:ANDROID_HOME, $env:ANDROID_SDK_ROOT,
          [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User'),
          "$env:LOCALAPPDATA\Android\Sdk")
    }
    $resolvedSdk = $sdkCandidates | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'platform-tools\adb.exe')) } | Select-Object -First 1
    if (-not $resolvedSdk) { throw "Android SDK not found. Run scripts/install-android-dependencies.ps1 or pass -SdkRoot 'D:\Android\Sdk'." }
    $env:ANDROID_HOME = [IO.Path]::GetFullPath($resolvedSdk)
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    Write-Host "Android SDK: $env:ANDROID_HOME"
    Write-Host "Java: $env:JAVA_HOME"
    if ($CheckOnly) {
        & "$env:ANDROID_HOME\platform-tools\adb.exe" --version
        if ($LASTEXITCODE) { throw 'Android Platform Tools could not run.' }
        & "$env:JAVA_HOME\bin\java.exe" -version
        if ($LASTEXITCODE) { throw 'Java could not run.' }
        Write-Host 'Android build dependency check passed.'
        return
    }
    if ($Production) {
        foreach ($name in @('MEDIAOPS_KEYSTORE_PATH','MEDIAOPS_KEYSTORE_PASSWORD','MEDIAOPS_KEY_ALIAS','MEDIAOPS_KEY_PASSWORD')) {
            if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Set $name before creating a signed production APK." }
        }
        if (-not (Test-Path -LiteralPath $env:MEDIAOPS_KEYSTORE_PATH)) { throw 'The release keystore does not exist.' }
    }
    $env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
    & (Join-Path $PSScriptRoot 'ensure-windows-ninja.ps1') -SdkRoot $env:ANDROID_HOME
    $env:APP_ENV = if ($Production) { 'production' } else { 'preview' }
    $env:EXPO_PUBLIC_API_URL = $ApiUrl.TrimEnd('/')
    $env:EXPO_PUBLIC_DEMO_ENABLED = if ($EnableDemo) { 'true' } else { 'false' }
    # Windows/MSIX AppData redirection can break Java's Unix-domain selector sockets.
    # Apply this to Gradle and its Java/Kotlin child processes as well as the launcher.
    $socketRoot = Join-Path $mobileRoot '.gradle-sockets'
    New-Item -ItemType Directory -Force -Path $socketRoot | Out-Null
    $socketOption = '-Djdk.net.unixdomain.tmpdir="' + $socketRoot.Replace('\', '/') + '"'
    if (-not $env:JAVA_TOOL_OPTIONS -or -not $env:JAVA_TOOL_OPTIONS.Contains($socketOption)) {
        $env:JAVA_TOOL_OPTIONS = ($env:JAVA_TOOL_OPTIONS + ' ' + $socketOption).Trim()
    }
    if ($SkipInstall -and $Reinstall) { throw 'Choose either -SkipInstall or -Reinstall.' }
    $lockHash = (Get-FileHash -LiteralPath 'package-lock.json' -Algorithm SHA256).Hash
    $installStamp = Join-Path $mobileRoot 'node_modules/.media-ops-lock.sha256'
    $installComplete = (Test-Path -LiteralPath 'node_modules/expo/bin/cli') -and
        (Test-Path -LiteralPath 'node_modules/typescript/bin/tsc') -and
        (Test-Path -LiteralPath 'node_modules/jest/bin/jest.js') -and
        (Test-Path -LiteralPath 'node_modules/.package-lock.json')
    $installedHash = if (Test-Path -LiteralPath $installStamp) { (Get-Content -LiteralPath $installStamp -Raw).Trim() } else { '' }
    if ($SkipInstall -and -not $installComplete) { throw 'Dependencies are incomplete. Close the project Metro/Expo preview and rerun without -SkipInstall to restore them.' }
    if (-not $SkipInstall -and ($Reinstall -or -not $installComplete -or $installedHash -ne $lockHash)) {
        & npm.cmd ci
        if ($LASTEXITCODE) { throw 'npm ci failed. If npm reports EPERM on a .node file, close Metro/Expo previews using this project and retry. A failed npm ci may leave node_modules incomplete.' }
        Set-Content -LiteralPath $installStamp -Value $lockHash -Encoding ascii
    } else { Write-Host 'Reusing installed dependencies.' }
    & npm.cmd run check:release
    if ($LASTEXITCODE) { throw 'Release checks failed.' }
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE) { throw 'Android prebuild failed.' }
    if (Test-Path -LiteralPath 'google-services.json') {
        Copy-Item -LiteralPath 'google-services.json' -Destination 'android/app/google-services.json' -Force
    }
    Push-Location android
    try { & .\gradlew.bat :app:assembleRelease --no-daemon; if ($LASTEXITCODE) { throw 'Gradle APK build failed.' } }
    finally { Pop-Location }
    $apkPath = Join-Path $mobileRoot 'android/app/build/outputs/apk/release/app-release.apk'
    if (-not (Test-Path -LiteralPath $apkPath)) { throw 'Gradle finished without the expected APK.' }
    Write-Host "APK: $apkPath"
    if (-not $Production) { Write-Host "Preview APK: demo=$($EnableDemo.IsPresent); debug signing. Use -Production with your keystore for release." }
} finally { Pop-Location }
