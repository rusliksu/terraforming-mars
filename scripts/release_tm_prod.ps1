param(
    [string]$HostAlias = "hostkey-codex",
    [string]$ExpectedGitSha,
    [string]$SnapshotRoot,
    [string[]]$IgnoredRealtimeGameId,
    [switch]$SkipStagingVerify,
    [switch]$SkipProdVerify,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

$ignoredRealtimeGameIds = @(Assert-TmIgnoredRealtimeGameIds -GameIds $IgnoredRealtimeGameId)

$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"
$promoteScript = Join-Path $PSScriptRoot "promote_tm_staging_to_prod.ps1"
$snapshotScript = Join-Path $PSScriptRoot "capture_tm_release_state.ps1"

if (-not (Test-Path $verifyScript)) {
    throw "Missing verify script: $verifyScript"
}

if (-not (Test-Path $promoteScript)) {
    throw "Missing promote script: $promoteScript"
}

if (-not (Test-Path $snapshotScript)) {
    throw "Missing release snapshot script: $snapshotScript"
}

function Assert-ReleasePins {
    param(
        [string]$ExpectedGitSha,
        [string]$StagingGitSha,
        [string]$ArtifactSha
    )

    if ($ExpectedGitSha -notmatch '^[0-9a-fA-F]{40}$') {
        throw "ExpectedGitSha is required and must be a full 40-character git SHA."
    }
    if ($StagingGitSha -notmatch '^[0-9a-fA-F]{40}$') {
        throw "Staging release manifest must contain a full 40-character gitSha."
    }
    if (-not $StagingGitSha.Equals($ExpectedGitSha, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Tested staging release drifted from the intended SHA. expected=$ExpectedGitSha actual=$StagingGitSha"
    }
    if ($ArtifactSha -notmatch '^[0-9a-fA-F]{64}$') {
        throw "Staging release manifest must contain a 64-character artifactSha256."
    }
}

if (-not $DryRun -and $ExpectedGitSha -notmatch '^[0-9a-fA-F]{40}$') {
    throw "ExpectedGitSha is required for prod release and must be a full 40-character git SHA."
}

$expectedArtifactSha = $null
$stagingGitSha = $null

if ($DryRun) {
    Write-Host "Dry run: release flow would do the following:"
    if (-not $SkipStagingVerify) {
        Write-Host "1. Verify staging with a real create-game smoke and release manifest."
    }
    Write-Host "2. Promote the tested staging build to prod."
    if (-not $SkipProdVerify) {
        Write-Host "3. Verify prod homepage, /elo/, and release manifest without creating a test game."
    }
    Write-Host ""
    $promoteDryRunArgs = @("-File", $promoteScript, "-HostAlias", $HostAlias, "-DryRun")
    if (-not [string]::IsNullOrWhiteSpace($ExpectedGitSha)) {
        $promoteDryRunArgs += @("-ExpectedGitSha", $ExpectedGitSha)
    }
    if ($ignoredRealtimeGameIds.Count -gt 0) {
        $promoteDryRunArgs += @("-IgnoredRealtimeGameId", ($ignoredRealtimeGameIds -join ","))
    }
    & pwsh @promoteDryRunArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Promote dry run failed."
    }
    exit 0
}

if (-not $SkipStagingVerify) {
    $stagingVerifyJson = & pwsh -File $verifyScript -Environment staging -RequireReleaseManifest -CreateGame -GameNamePrefix ReleaseGate -OutputJson
    if ($LASTEXITCODE -ne 0) {
        throw "Staging verification failed. Promote aborted."
    }
    $stagingVerify = $stagingVerifyJson | ConvertFrom-Json
    $expectedArtifactSha = [string]$stagingVerify.release.artifactSha256
    $stagingGitSha = [string]$stagingVerify.release.gitSha
}

if ($SkipStagingVerify) {
    $stagingManifestJson = & pwsh -File $verifyScript -Environment staging -RequireReleaseManifest -OutputJson
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read staging release manifest. Promote aborted."
    }
    $stagingManifest = $stagingManifestJson | ConvertFrom-Json
    $expectedArtifactSha = [string]$stagingManifest.release.artifactSha256
    $stagingGitSha = [string]$stagingManifest.release.gitSha
}

Assert-ReleasePins -ExpectedGitSha $ExpectedGitSha -StagingGitSha $stagingGitSha -ArtifactSha $expectedArtifactSha

if ([string]::IsNullOrWhiteSpace($SnapshotRoot)) {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $workspaceRoot = Split-Path -Parent $repoRoot
    $SnapshotRoot = Join-Path $workspaceRoot ".tmp\deploy-snapshots"
}
$snapshotRunRoot = Join-Path $SnapshotRoot ("prod-{0}" -f (New-TmReleaseRunToken))
$preSnapshotPath = Join-Path $snapshotRunRoot "pre.json"
$postSnapshotPath = Join-Path $snapshotRunRoot "post.json"

$preSnapshotJson = & pwsh -File $snapshotScript -HostAlias $HostAlias -OutputPath $preSnapshotPath -OutputJson
if ($LASTEXITCODE -ne 0) {
    throw "Failed to capture pre-promote release state."
}
$preSnapshot = $preSnapshotJson | ConvertFrom-Json
if ($preSnapshot.deployLock.busy -eq $true) {
    throw "Another TM deploy or promote is already running. Pre-promote snapshot: $preSnapshotPath"
}
$snapshotStagingGitSha = [string]$preSnapshot.environments.staging.manifest.gitSha
$snapshotStagingArtifactSha = [string]$preSnapshot.environments.staging.manifest.artifactSha256
if (-not $snapshotStagingGitSha.Equals($ExpectedGitSha, [System.StringComparison]::OrdinalIgnoreCase) -or $snapshotStagingArtifactSha -ne $expectedArtifactSha) {
    throw "Staging changed between verification and pre-promote snapshot. Promote aborted."
}
$releaseBaselineBase64 = ConvertTo-TmReleaseCasBaselineBase64 -Snapshot $preSnapshot
Write-Host "Pre-snapshot : $preSnapshotPath"

$promoteArgs = @(
    "-File", $promoteScript,
    "-HostAlias", $HostAlias
)
if (-not [string]::IsNullOrWhiteSpace($expectedArtifactSha)) {
    $promoteArgs += @("-ExpectedArtifactSha", $expectedArtifactSha)
}
$promoteArgs += @("-ExpectedGitSha", $ExpectedGitSha)
$promoteArgs += @("-ExpectedReleaseBaselineBase64", $releaseBaselineBase64)
if ($ignoredRealtimeGameIds.Count -gt 0) {
    $promoteArgs += @("-IgnoredRealtimeGameId", ($ignoredRealtimeGameIds -join ","))
}

try {
    & pwsh @promoteArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Promote from staging to prod failed."
    }

    if (-not $SkipProdVerify) {
        $prodVerifyJson = & pwsh -File $verifyScript -Environment prod -RequireReleaseManifest -OutputJson
        if ($LASTEXITCODE -ne 0) {
            throw "Prod verification failed after promote."
        }
        $prodVerify = $prodVerifyJson | ConvertFrom-Json
        $prodArtifactSha = [string]$prodVerify.release.artifactSha256
        $prodGitSha = [string]$prodVerify.release.gitSha

        if ($prodArtifactSha -ne $expectedArtifactSha) {
            throw "Prod artifact hash mismatch after promote. staging=$expectedArtifactSha prod=$prodArtifactSha"
        }
        if (-not $prodGitSha.Equals($ExpectedGitSha, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Prod git sha mismatch after promote. intended=$ExpectedGitSha prod=$prodGitSha"
        }

        Write-Host "Release gate OK"
        Write-Host "Artifact    : sha256=$prodArtifactSha git=$prodGitSha"
    }
} finally {
    try {
        & pwsh -File $snapshotScript -HostAlias $HostAlias -OutputPath $postSnapshotPath -OutputJson | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Release snapshot command exited with code $LASTEXITCODE."
        }
        Write-Host "Post-snapshot: $postSnapshotPath"
    } catch {
        Write-Host "Warning: failed to capture post-promote release state." -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
}
