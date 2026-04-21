param(
    [string]$HostAlias = "vps",
    [string]$SourceRoot,
    [switch]$AllowDirtySource,
    [switch]$AllowPrimaryWorkingTree,
    [switch]$SkipSmoke,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

$deployScript = Join-Path $PSScriptRoot "deploy_tm_server.ps1"
$smokeScript = Join-Path $PSScriptRoot "smoke_tm_staging.ps1"

if (-not (Test-Path $deployScript)) {
    throw "Missing deploy script: $deployScript"
}

if (-not (Test-Path $smokeScript)) {
    throw "Missing smoke script: $smokeScript"
}

if (-not [string]::IsNullOrWhiteSpace($SourceRoot) -and -not (Test-Path $SourceRoot)) {
    throw "SourceRoot does not exist: $SourceRoot"
}

$args = @(
    "-File", $deployScript,
    "-Environment", "staging",
    "-HostAlias", $HostAlias
)

if (-not [string]::IsNullOrWhiteSpace($SourceRoot)) {
    $args += @("-SourceRoot", $SourceRoot)
}

if ($DryRun) {
    $args += "-DryRun"
}
if ($AllowDirtySource) {
    $args += "-AllowDirtySource"
}
if ($AllowPrimaryWorkingTree) {
    $args += "-AllowPrimaryWorkingTree"
}

& pwsh @args
if ($LASTEXITCODE -ne 0) {
    throw "Staging deploy failed."
}

if (-not $DryRun -and -not $SkipSmoke) {
    & pwsh -File $smokeScript
    if ($LASTEXITCODE -ne 0) {
        throw "Staging smoke failed."
    }
}
