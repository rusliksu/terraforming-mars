param(
    [string]$HostAlias = "hostkey-codex",
    [string]$ReleaseRoot,
    [string]$TierlistRoot,
    [string]$SnapshotRoot,
    [string[]]$IgnoredRealtimeGameId,
    [switch]$BootstrapIfMissing,
    [switch]$AllowDirtyReleaseCheckout,
    [switch]$AllowDirtySource,
    [switch]$AllowPrimaryWorkingTree,
    [switch]$SyncServices,
    [switch]$SkipServiceSync,
    [switch]$RestartWatchersDuringServiceSync,
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$ForceRedeploy,
    [switch]$SkipSmoke,
    [switch]$SkipStagingVerify,
    [switch]$SkipProdVerify,
    [switch]$PromoteProd,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

$ignoredRealtimeGameIds = @(Assert-TmIgnoredRealtimeGameIds -GameIds $IgnoredRealtimeGameId)

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

$requiredScripts = @($refreshScript, $deployScript)
if ($SyncServices -and -not $SkipServiceSync) {
    $requiredScripts += $syncServicesScript
}

function Get-TmFullGitSha {
    param(
        [string]$RepoRoot
    )

    $sha = (& git -C $RepoRoot rev-parse --verify HEAD 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $sha -notmatch '^[0-9a-fA-F]{40}$') {
        throw "Could not resolve a full intended release SHA from $RepoRoot."
    }
    return $sha.ToLowerInvariant()
}
if ($PromoteProd) {
    $requiredScripts += $releaseScript
}
foreach ($scriptPath in $requiredScripts) {
    if (-not (Test-Path $scriptPath)) {
        throw "Missing required script: $scriptPath"
    }
}

Write-Host "TM rollout orchestration"
Write-Host "Host        : $HostAlias"
Write-Host "ReleaseRoot : $ReleaseRoot"
Write-Host "TierlistRoot: $TierlistRoot"
Write-Host "SyncServices: $($SyncServices -and -not $SkipServiceSync)"
Write-Host "PromoteProd : $PromoteProd"
Write-Host "DryRun      : $DryRun"
Write-Host ""

$step = 1
$totalSteps = 2
if ($SyncServices -and -not $SkipServiceSync) {
    $totalSteps++
}
if ($PromoteProd) {
    $totalSteps++
}

if ($SyncServices -and -not $SkipServiceSync) {
    $syncArgs = @("-File", $syncServicesScript, "-HostAlias", $HostAlias, "-TierlistRoot", $TierlistRoot)
    if ($RestartWatchersDuringServiceSync) {
        $syncArgs += "-RestartWatchers"
    }
    if ($DryRun) {
        $syncArgs += "-DryRun"
    }

    Write-Host "Step $step/${totalSteps}: Sync versioned TM service configs"
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

Write-Host "Step $step/${totalSteps}: Refresh clean release checkout"
Invoke-CheckedPwsh -Arguments $refreshArgs -FailureMessage "Release checkout refresh failed."
Write-Host ""
$step++

$intendedGitSha = Get-TmFullGitSha -RepoRoot $ReleaseRoot
Write-Host "Intended SHA: $intendedGitSha"
Write-Host ""

$deployArgs = @(
    "-File", $deployScript,
    "-HostAlias", $HostAlias,
    "-SourceRoot", $ReleaseRoot,
    "-ExpectedGitSha", $intendedGitSha
)
if ($AllowDirtySource) {
    $deployArgs += "-AllowDirtySource"
}
if ($AllowPrimaryWorkingTree) {
    $deployArgs += "-AllowPrimaryWorkingTree"
}
if ($SkipSmoke) {
    $deployArgs += "-SkipSmoke"
}
if ($ForceRedeploy) {
    $deployArgs += "-ForceRedeploy"
}
if (-not [string]::IsNullOrWhiteSpace($SnapshotRoot)) {
    $deployArgs += @("-SnapshotRoot", $SnapshotRoot)
}
if ($DryRun) {
    $deployArgs += "-DryRun"
}

Write-Host "Step $step/${totalSteps}: Deploy release checkout to staging"
Invoke-CheckedPwsh -Arguments $deployArgs -FailureMessage "Staging deploy failed."
Write-Host ""
$step++

if ($PromoteProd) {
    $releaseArgs = @(
        "-File", $releaseScript,
        "-HostAlias", $HostAlias,
        "-ExpectedGitSha", $intendedGitSha
    )
    if ($SkipStagingVerify) {
        $releaseArgs += "-SkipStagingVerify"
    }
    if ($SkipProdVerify) {
        $releaseArgs += "-SkipProdVerify"
    }
    if (-not [string]::IsNullOrWhiteSpace($SnapshotRoot)) {
        $releaseArgs += @("-SnapshotRoot", $SnapshotRoot)
    }
    if ($ignoredRealtimeGameIds.Count -gt 0) {
        $releaseArgs += @("-IgnoredRealtimeGameId", ($ignoredRealtimeGameIds -join ","))
    }
    if ($DryRun) {
        $releaseArgs += "-DryRun"
    }

    Write-Host "Step $step/${totalSteps}: Promote tested staging artifact to prod"
    Invoke-CheckedPwsh -Arguments $releaseArgs -FailureMessage "Prod release gate failed."
    Write-Host ""
}

if ($DryRun) {
    Write-Host "TM rollout dry run complete"
} else {
    if ($PromoteProd) {
        Write-Host "TM rollout complete"
    } else {
        Write-Host "TM staging rollout complete. Prod was not requested."
    }
}
