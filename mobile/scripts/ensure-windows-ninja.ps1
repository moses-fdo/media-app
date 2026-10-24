param([Parameter(Mandatory = $true)][string]$SdkRoot)
$ErrorActionPreference = 'Stop'
# Android's bundled Ninja 1.10 cannot create Reanimated's long Windows paths.
$ninjaFiles = @(Get-ChildItem -LiteralPath (Join-Path $SdkRoot 'cmake') -Filter ninja.exe -Recurse | Where-Object {
    $version = & $_.FullName --version
    if ($LASTEXITCODE) { throw "Cannot run $($_.FullName)" }
    [version]$version -lt [version]'1.12.0'
})
if (-not $ninjaFiles.Count) { return }
$downloadRoot = Join-Path $env:TEMP 'media-ops-ninja-1.13.2'
New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
$archive = Join-Path $downloadRoot 'ninja-win.zip'
& curl.exe --fail --location --retry 3 --output $archive 'https://github.com/ninja-build/ninja/releases/download/v1.13.2/ninja-win.zip'
if ($LASTEXITCODE) { throw 'Ninja download failed.' }
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne '07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65') { throw 'Ninja archive checksum mismatch.' }
Expand-Archive -LiteralPath $archive -DestinationPath $downloadRoot -Force
foreach ($ninjaFile in $ninjaFiles) {
    $backup = $ninjaFile.FullName + '.sdk-original'
    if (-not (Test-Path -LiteralPath $backup)) { Copy-Item -LiteralPath $ninjaFile.FullName -Destination $backup }
    Copy-Item -LiteralPath (Join-Path $downloadRoot 'ninja.exe') -Destination $ninjaFile.FullName -Force
    Write-Host "Updated Windows Ninja: $($ninjaFile.FullName)"
    & $ninjaFile.FullName --version
    if ($LASTEXITCODE) { throw 'Updated Ninja could not run.' }
}
