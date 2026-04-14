param(
    [string]$HostAlias = "vps",
    [string]$TierlistRoot,
    [switch]$SkipRuntimeSync,
    [switch]$SkipWatcherSync,
    [switch]$RestartWatchers,
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

if ([string]::IsNullOrWhiteSpace($TierlistRoot)) {
    $TierlistRoot = Join-Path $tmWorkspaceRoot "tm-tierlist"
}

$runtimeScript = Join-Path $PSScriptRoot "sync_tm_runtime_services.ps1"
$watcherScript = Join-Path $TierlistRoot "scripts\sync_tm_watcher_services.ps1"

if (-not $SkipRuntimeSync -and -not (Test-Path $runtimeScript)) {
    throw "Missing runtime sync script: $runtimeScript"
}
if (-not $SkipWatcherSync -and -not (Test-Path $watcherScript)) {
    throw "Missing watcher sync script: $watcherScript"
}

Write-Host "TM service sync"
Write-Host "Host         : $HostAlias"
Write-Host "TierlistRoot : $TierlistRoot"
Write-Host "DryRun       : $DryRun"
Write-Host ""

if (-not $SkipRuntimeSync) {
    $runtimeArgs = @("-File", $runtimeScript, "-VpsHost", $HostAlias)
    if ($DryRun) {
        $runtimeArgs += "-DryRun"
    }

    Write-Host "Step 1/2: Sync TM runtime systemd units"
    Invoke-CheckedPwsh -Arguments $runtimeArgs -FailureMessage "Runtime service sync failed."
    Write-Host ""
}

if (-not $SkipWatcherSync) {
    $watcherArgs = @("-File", $watcherScript, "-VpsHost", $HostAlias)
    if ($DryRun) {
        $watcherArgs += "-DryRun"
    } elseif (-not $RestartWatchers) {
        $watcherArgs += "-NoRestart"
    }

    Write-Host "Step $(if ($SkipRuntimeSync) { '1' } else { '2' })/2: Sync TM watcher systemd units"
    Invoke-CheckedPwsh -Arguments $watcherArgs -FailureMessage "Watcher service sync failed."
    Write-Host ""
}

if ($DryRun) {
    Write-Host "TM service sync dry run complete"
} else {
    Write-Host "TM service sync complete"
}
