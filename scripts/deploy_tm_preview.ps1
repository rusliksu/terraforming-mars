param(
    [string]$HostAlias = "vps",
    [string]$SourceRoot,
    [switch]$AllowDirtySource,
    [switch]$AllowPrimaryWorkingTree,
    [switch]$SkipVerify,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$deployScript = Join-Path $PSScriptRoot "deploy_tm_server.ps1"
$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"

foreach ($scriptPath in @($deployScript, $verifyScript)) {
    if (-not (Test-Path $scriptPath)) {
        throw "Missing required script: $scriptPath"
    }
}

$args = @(
    "-File", $deployScript,
    "-Environment", "preview",
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
    throw "Preview deploy failed."
}

if (-not $DryRun -and -not $SkipVerify) {
    & pwsh -File $verifyScript -Environment preview -RequireReleaseManifest -CreateGame
    if ($LASTEXITCODE -ne 0) {
        throw "Preview verify failed."
    }
}
