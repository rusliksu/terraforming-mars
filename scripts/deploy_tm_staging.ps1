param(
    [string]$HostAlias = "hostkey-codex",
    [string]$SourceRoot,
    [string]$ExpectedGitSha,
    [string]$SnapshotRoot,
    [switch]$AllowDirtySource,
    [switch]$AllowPrimaryWorkingTree,
    [switch]$ForceRedeploy,
    [switch]$SkipSmoke,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($AllowDirtySource -or $AllowPrimaryWorkingTree) {
    throw "Staging deploy accepts only a clean checkout whose HEAD equals origin/main; staging bypass flags are not supported."
}

. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

$repoRoot = Split-Path -Parent $PSScriptRoot

$deployScript = Join-Path $PSScriptRoot "deploy_tm_server.ps1"
$smokeScript = Join-Path $PSScriptRoot "smoke_tm_staging.ps1"
$snapshotScript = Join-Path $PSScriptRoot "capture_tm_release_state.ps1"
$sentryReleaseScript = Join-Path $PSScriptRoot "report_tm_sentry_release.ps1"

if (-not (Test-Path $deployScript)) {
    throw "Missing deploy script: $deployScript"
}

if (-not (Test-Path $smokeScript)) {
    throw "Missing smoke script: $smokeScript"
}

if (-not (Test-Path $snapshotScript)) {
    throw "Missing release snapshot script: $snapshotScript"
}

if (-not (Test-Path $sentryReleaseScript)) {
    throw "Missing Sentry release reporter: $sentryReleaseScript"
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
if (-not [string]::IsNullOrWhiteSpace($ExpectedGitSha)) {
    $args += @("-ExpectedGitSha", $ExpectedGitSha)
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
if ($ForceRedeploy) {
    $args += "-ForceRedeploy"
}

if ([string]::IsNullOrWhiteSpace($SnapshotRoot)) {
    $workspaceRoot = Split-Path -Parent $repoRoot
    $SnapshotRoot = Join-Path $workspaceRoot ".tmp\deploy-snapshots"
}
$snapshotRunRoot = Join-Path $SnapshotRoot ("staging-{0}" -f (New-TmReleaseRunToken))
$preSnapshotPath = Join-Path $snapshotRunRoot "pre.json"
$postSnapshotPath = Join-Path $snapshotRunRoot "post.json"

if (-not $DryRun) {
    & pwsh -File $sentryReleaseScript -HostAlias $HostAlias -PreflightOnly
    if ($LASTEXITCODE -ne 0) {
        throw "Sentry release preflight failed before staging deploy."
    }

    $preSnapshotJson = & pwsh -File $snapshotScript -HostAlias $HostAlias -OutputPath $preSnapshotPath -OutputJson
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to capture pre-deploy release state."
    }
    $preSnapshot = $preSnapshotJson | ConvertFrom-Json
    if ($preSnapshot.deployLock.busy -eq $true) {
        throw "Another TM deploy or promote is already running. Pre-deploy snapshot: $preSnapshotPath"
    }
    $releaseBaselineBase64 = ConvertTo-TmReleaseCasBaselineBase64 -Snapshot $preSnapshot
    $args += @("-ExpectedReleaseBaselineBase64", $releaseBaselineBase64)
    Write-Host "Pre-snapshot : $preSnapshotPath"
}

$postSnapshotCaptured = $false
$deployStartedAtUtc = [DateTimeOffset]::UtcNow.ToString("o", [Globalization.CultureInfo]::InvariantCulture)
try {
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

    if (-not $DryRun) {
        $postSnapshotJson = & pwsh -File $snapshotScript -HostAlias $HostAlias -OutputPath $postSnapshotPath -OutputJson
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to capture post-deploy release state."
        }
        $postSnapshotCaptured = $true
        $postSnapshot = $postSnapshotJson | ConvertFrom-Json
        . (Join-Path $PSScriptRoot "lib\TmSentryRelease.ps1")
        $servedGitSha = Get-TmStagingReleaseGitSha -Snapshot $postSnapshot -ExpectedGitSha $ExpectedGitSha
        Write-Host "Post-snapshot: $postSnapshotPath"

        if ($SkipSmoke) {
            Write-Host "Sentry deploy: skipped because -SkipSmoke was requested."
        } else {
            $deployFinishedAtUtc = [DateTimeOffset]::UtcNow.ToString("o", [Globalization.CultureInfo]::InvariantCulture)
            & pwsh -File $sentryReleaseScript `
                -HostAlias $HostAlias `
                -ReleaseGitSha $servedGitSha `
                -StartedAtUtc $deployStartedAtUtc `
                -FinishedAtUtc $deployFinishedAtUtc
            if ($LASTEXITCODE -ne 0) {
                throw "Sentry release/deploy publication failed after verified staging deploy."
            }
        }
    }
} finally {
    if (-not $DryRun -and -not $postSnapshotCaptured) {
        try {
            & pwsh -File $snapshotScript -HostAlias $HostAlias -OutputPath $postSnapshotPath -OutputJson | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "Release snapshot command exited with code $LASTEXITCODE."
            }
            Write-Host "Post-snapshot: $postSnapshotPath"
        } catch {
            Write-Host "Warning: failed to capture post-deploy release state." -ForegroundColor Yellow
            Write-Host $_.Exception.Message -ForegroundColor Yellow
        }
    }
}
