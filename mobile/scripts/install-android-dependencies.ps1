param(
    [string]$SdkRoot = (Join-Path ([IO.Path]::GetPathRoot((Split-Path $PSScriptRoot -Parent))) 'Android\Sdk'),
    [switch]$SkipNdk
)
$ErrorActionPreference = 'Stop'
$javaRoot = 'C:\Program Files\Android\Android Studio\jbr'
if (-not (Test-Path -LiteralPath "$javaRoot\bin\java.exe")) { throw 'Install Android Studio first, including its bundled Java runtime.' }
$env:JAVA_HOME = $javaRoot
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$toolsVersion = '22.0' # Last Java-based manager; avoids the new native CLI bootstrap on Windows.
$toolsDirectory = Join-Path $SdkRoot "cmdline-tools\$toolsVersion"
$env:PATH = "$javaRoot\bin;$SdkRoot\platform-tools;$toolsDirectory\bin;$env:PATH"
$sdkManager = Join-Path $toolsDirectory 'bin\sdkmanager.bat'
if (-not (Test-Path -LiteralPath $sdkManager)) {
    $repository = [xml](Invoke-WebRequest 'https://dl.google.com/android/repository/repository2-3.xml').Content
    $package = $repository.SelectNodes('//*[local-name()="remotePackage"]') | Where-Object { $_.path -eq "cmdline-tools;$toolsVersion" }
    $archive = ($package.archives.archive | Where-Object { $_.'host-os' -eq 'windows' }).complete
    if (-not $archive.url -or -not $archive.checksum) { throw 'Cannot find the official Windows tools archive metadata.' }
    $downloadRoot = Join-Path $env:TEMP ('media-ops-android-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
    $zipPath = Join-Path $downloadRoot 'command-line-tools.zip'
    Write-Host "Downloading https://dl.google.com/android/repository/$($archive.url)"
    & curl.exe --fail --location --retry 3 --output $zipPath "https://dl.google.com/android/repository/$($archive.url)"
    if ($LASTEXITCODE) { throw 'Android command-line tools download failed.' }
    $expected = if ($archive.checksum -is [System.Xml.XmlElement]) { $archive.checksum.InnerText } else { [string]$archive.checksum }
    if ((Get-FileHash -LiteralPath $zipPath -Algorithm SHA1).Hash -ne $expected.Trim()) { throw 'Official archive checksum mismatch.' }
    Expand-Archive -LiteralPath $zipPath -DestinationPath $downloadRoot
    New-Item -ItemType Directory -Force -Path (Join-Path $SdkRoot 'cmdline-tools') | Out-Null
    $sourcePath = [IO.Path]::GetFullPath((Join-Path $downloadRoot 'cmdline-tools'))
    $destinationPath = [IO.Path]::GetFullPath($toolsDirectory)
    if (-not $sourcePath.StartsWith([IO.Path]::GetFullPath($downloadRoot) + [IO.Path]::DirectorySeparatorChar) -or
        -not $destinationPath.StartsWith([IO.Path]::GetFullPath($SdkRoot) + [IO.Path]::DirectorySeparatorChar)) { throw 'SDK tools move escaped its intended directories.' }
    Move-Item -LiteralPath $sourcePath -Destination $destinationPath
    Write-Host 'Command-line tools downloaded and checksum verified.'
}

# Installation includes accepting the standard Android SDK package licenses.
1..100 | ForEach-Object { 'y' } | & $sdkManager "--sdk_root=$SdkRoot" --licenses
if ($LASTEXITCODE) { throw 'Android SDK license acceptance failed.' }
$packages = @('platform-tools', 'platforms;android-37.0', 'build-tools;37.0.0', 'ndk;27.1.12297006', 'cmake;3.22.1', 'cmake;3.30.5')
if ($SkipNdk) { $packages = @($packages | Where-Object { $_ -notlike 'ndk;*' }) }
& $sdkManager "--sdk_root=$SdkRoot" --install @packages
if ($LASTEXITCODE) { throw 'Android SDK package installation failed.' }
& (Join-Path $PSScriptRoot 'ensure-windows-ninja.ps1') -SdkRoot $SdkRoot

foreach ($name in @('JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT')) {
    [Environment]::SetEnvironmentVariable($name, [Environment]::GetEnvironmentVariable($name), 'User')
}
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$entries = @("$javaRoot\bin", "$SdkRoot\platform-tools", "$toolsDirectory\bin") + ($userPath -split ';' | Where-Object { $_ })
[Environment]::SetEnvironmentVariable('Path', (($entries | Select-Object -Unique) -join ';'), 'User')
Write-Host "Android SDK installed: $SdkRoot"
Write-Host "Gradle Java runtime: $javaRoot"
& $sdkManager "--sdk_root=$SdkRoot" --list_installed
