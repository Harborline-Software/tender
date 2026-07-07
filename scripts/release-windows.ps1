<#
.SYNOPSIS
    Build the Harborline Toolbox Windows release artifacts (.msi) and emit their SHA-256 checksums.

.DESCRIPTION
    Wraps `npx tauri build` for the desktop app's Windows target(s) so a repeatable release build is
    one command, not tribal knowledge (mirrors the fleet's `deploy-dogfood.ps1` / `run-8885.cmd`
    pattern -- see coordination/handoffs/toolbox-dist-r1a.md for the dogfood distribution context,
    CIC Toolbox distribution dogfood ruling 2026-07-07).

    Confirms/adopts the existing version scheme: the release version is read from
    apps/desktop/src-tauri/tauri.conf.json ("version") -- this script does NOT bump it. Bump the
    version in tauri.conf.json (and apps/desktop/package.json to match) before cutting a release.

    Produces one .msi per requested target under
    apps/desktop/src-tauri/target/<target-triple>/release/bundle/msi/ (native target uses
    target/release/bundle/msi/ with no target-triple segment), plus a SHA256SUMS file next to them.

    NOTE: MSI bytes are NOT reproducible across separate build runs of the same source (WiX assigns
    a fresh ProductCode GUID each `light` invocation) -- the checksum you publish is whichever build
    you actually ship, not a property of the source tree. This mirrors the update-feed tool's own
    non-reproducibility caveat (shipyard/tooling/update-feed/README.md). Compute + publish the
    SHA-256 from the SAME file you upload, never a prior run's hash.

.PARAMETER Targets
    One or more Rust target triples to build. Defaults to the native host target (x64). Pass
    'aarch64-pc-windows-msvc' for ARM64 (Surface Pro) -- requires `rustup target add
    aarch64-pc-windows-msvc` once, and only proceeds if that target is actually installed (never
    silently skips a requested target without saying so).

.EXAMPLE
    ./scripts/release-windows.ps1
    Builds the native (x64) target only.

.EXAMPLE
    ./scripts/release-windows.ps1 -Targets x86_64-pc-windows-msvc,aarch64-pc-windows-msvc
    Builds both x64 and ARM64 MSI installers.
#>
[CmdletBinding()]
param(
    [string[]]$Targets = @('x86_64-pc-windows-msvc')
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktopDir = Join-Path $repoRoot 'apps\desktop'
$tauriConfPath = Join-Path $desktopDir 'src-tauri\tauri.conf.json'

if (-not (Test-Path $tauriConfPath)) {
    throw "tauri.conf.json not found at $tauriConfPath -- run this script from a tender checkout."
}
$tauriConf = Get-Content $tauriConfPath -Raw | ConvertFrom-Json
$version = $tauriConf.version
Write-Host "Harborline Toolbox release build -- version $version (from tauri.conf.json, not bumped by this script)"

$installedTargets = (rustup target list --installed)
foreach ($target in $Targets) {
    if ($installedTargets -notcontains $target) {
        throw "Rust target '$target' is not installed. Run: rustup target add $target"
    }
}

Push-Location $desktopDir
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit $LASTEXITCODE)" }

    $artifacts = @()
    foreach ($target in $Targets) {
        $native = $target -eq 'x86_64-pc-windows-msvc'
        if ($native) {
            Write-Host "Building native target ($target) ..."
            npx tauri build
            $bundleDir = Join-Path $desktopDir 'src-tauri\target\release\bundle\msi'
        } else {
            Write-Host "Building cross target ($target) ..."
            npx tauri build --target $target
            $bundleDir = Join-Path $desktopDir "src-tauri\target\$target\release\bundle\msi"
        }
        if ($LASTEXITCODE -ne 0) { throw "tauri build failed for $target (exit $LASTEXITCODE)" }

        $msi = Get-ChildItem $bundleDir -Filter '*.msi' | Select-Object -First 1
        if (-not $msi) { throw "no .msi produced for $target under $bundleDir" }
        $artifacts += $msi.FullName
    }

    Write-Host ""
    Write-Host "Artifacts + SHA-256:"
    foreach ($path in $artifacts) {
        $hash = Get-FileHash -Algorithm SHA256 $path
        $size = (Get-Item $path).Length
        Write-Host "  $($hash.Hash.ToLower())  $size bytes  $path"
    }
}
finally {
    Pop-Location
}
