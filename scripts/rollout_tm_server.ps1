param(
    [string]$HostAlias = "vps",
    [string]$ReleaseRoot,
    [string]$TierlistRoot,
    [switch]$BootstrapIfMissing,
    [switch]$AllowDirtyReleaseCheckout,
    [switch]$AllowDirtySource,
    [switch]$AllowPrimaryWorkingTree,
    [switch]$SkipServiceSync,
    [switch]$RestartWatchersDuringServiceSync,
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$SkipSmoke,
    [switch]$SkipStagingVerify,
    [switch]$SkipProdVerify,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-CheckedPwsh {
    param(
        [string[]]$Arguments,
        [string]$FailureMessage
    )

    & pwsh @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$tmWorkspaceRoot = Split-Path -Parent $repoRoot

if ([string]::IsNullOrWhiteSpace($ReleaseRoot)) {
    $ReleaseRoot = Join-Path $tmWorkspaceRoot "terraforming-mars-release-main"
}
if ([string]::IsNullOrWhiteSpace($TierlistRoot)) {
    $TierlistRoot = Join-Path $tmWorkspaceRoot "tm-tierlist"
}

$syncServicesScript = Join-Path $PSScriptRoot "sync_tm_services.ps1"
$refreshScript = Join-Path $PSScriptRoot "refresh_tm_release_checkout.ps1"
$deployScript = Join-Path $PSScriptRoot "deploy_tm_staging.ps1"
$releaseScript = Join-Path $PSScriptRoot "release_tm_prod.ps1"

foreach ($scriptPath in @($syncServicesScript, $refreshScript, $deployScript, $releaseScript)) {
    if (-not (Test-Path $scriptPath)) {
        throw "Missing required script: $scriptPath"
    }
}

Write-Host "TM rollout orchestration"
Write-Host "Host        : $HostAlias"
Write-Host "ReleaseRoot : $ReleaseRoot"
Write-Host "TierlistRoot: $TierlistRoot"
Write-Host "DryRun      : $DryRun"
Write-Host ""

$step = 1
if (-not $SkipServiceSync) {
    $syncArgs = @("-File", $syncServicesScript, "-HostAlias", $HostAlias, "-TierlistRoot", $TierlistRoot)
    if ($RestartWatchersDuringServiceSync) {
        $syncArgs += "-RestartWatchers"
    }
    if ($DryRun) {
        $syncArgs += "-DryRun"
    }

    Write-Host "Step $step/4: Sync versioned TM service configs"
    Invoke-CheckedPwsh -Arguments $syncArgs -FailureMessage "TM service sync failed."
    Write-Host ""
    $step++
}

$refreshArgs = @("-File", $refreshScript, "-ReleaseRoot", $ReleaseRoot)
if ($BootstrapIfMissing) {
    $refreshArgs += "-BootstrapIfMissing"
}
if ($AllowDirtyReleaseCheckout) {
    $refreshArgs += "-AllowDirtyReleaseCheckout"
}
if ($SkipInstall) {
    $refreshArgs += "-SkipInstall"
}
if ($SkipBuild) {
    $refreshArgs += "-SkipBuild"
}
if ($DryRun) {
    $refreshArgs += "-DryRun"
}

Write-Host "Step $step/4: Refresh clean release checkout"
Invoke-CheckedPwsh -Arguments $refreshArgs -FailureMessage "Release checkout refresh failed."
Write-Host ""
$step++

$deployArgs = @("-File", $deployScript, "-HostAlias", $HostAlias, "-SourceRoot", $ReleaseRoot)
if ($AllowDirtySource) {
    $deployArgs += "-AllowDirtySource"
}
if ($AllowPrimaryWorkingTree) {
    $deployArgs += "-AllowPrimaryWorkingTree"
}
if ($SkipSmoke) {
    $deployArgs += "-SkipSmoke"
}
if ($DryRun) {
    $deployArgs += "-DryRun"
}

Write-Host "Step $step/4: Deploy release checkout to staging"
Invoke-CheckedPwsh -Arguments $deployArgs -FailureMessage "Staging deploy failed."
Write-Host ""
$step++

$releaseArgs = @("-File", $releaseScript, "-HostAlias", $HostAlias)
if ($SkipStagingVerify) {
    $releaseArgs += "-SkipStagingVerify"
}
if ($SkipProdVerify) {
    $releaseArgs += "-SkipProdVerify"
}
if ($DryRun) {
    $releaseArgs += "-DryRun"
}

Write-Host "Step $step/4: Promote tested staging artifact to prod"
Invoke-CheckedPwsh -Arguments $releaseArgs -FailureMessage "Prod release gate failed."
Write-Host ""

if ($DryRun) {
    Write-Host "TM rollout dry run complete"
} else {
    Write-Host "TM rollout complete"
}
