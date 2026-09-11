$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmSentryRelease.ps1")

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) {
        throw $Message
    }
}

$sha = "0123456789abcdef0123456789abcdef01234567"
$snapshot = [pscustomobject]@{
    environments = [pscustomobject]@{
        staging = [pscustomobject]@{
            manifest = [pscustomobject]@{
                environment = "staging"
                gitSha = $sha.ToUpperInvariant()
                sourceTreeClean = $true
            }
        }
    }
}

Assert-True ((Get-TmStagingReleaseGitSha -Snapshot $snapshot) -eq $sha) "Snapshot SHA was not normalized."
Assert-True ((Get-TmStagingReleaseGitSha -Snapshot $snapshot -ExpectedGitSha $sha) -eq $sha) "Expected SHA was not verified."

$snapshot.environments.staging.manifest.sourceTreeClean = $false
try {
    Get-TmStagingReleaseGitSha -Snapshot $snapshot | Out-Null
    throw "Dirty release manifest was accepted."
} catch {
    Assert-True ($_.Exception.Message -match "clean source tree") "Dirty manifest failed for an unexpected reason."
}

$python = Get-Command python -ErrorAction Stop | Select-Object -First 1
& $python.Source -m py_compile (Join-Path $PSScriptRoot "lib\tm_sentry_release_remote.py")
if ($LASTEXITCODE -ne 0) {
    throw "Sentry remote reporter did not compile."
}
& $python.Source -m unittest (Join-Path $PSScriptRoot "tests\test_tm_sentry_release_remote.py")
if ($LASTEXITCODE -ne 0) {
    throw "Sentry remote reporter tests failed."
}

$stagingSource = Get-Content -Raw (Join-Path $PSScriptRoot "deploy_tm_staging.ps1")
$preflightIndex = $stagingSource.IndexOf('-PreflightOnly')
$deployIndex = $stagingSource.IndexOf('& pwsh @args')
$smokeIndex = $stagingSource.IndexOf('& pwsh -File $smokeScript')
$snapshotIndex = $stagingSource.IndexOf('$postSnapshotJson =')
$reportIndex = $stagingSource.IndexOf('-ReleaseGitSha $servedGitSha')
Assert-True ($preflightIndex -ge 0 -and $preflightIndex -lt $deployIndex) "Sentry preflight must happen before deploy."
Assert-True ($deployIndex -lt $smokeIndex -and $smokeIndex -lt $snapshotIndex -and $snapshotIndex -lt $reportIndex) "Sentry reporting order is not deploy -> smoke -> snapshot -> report."
Assert-True ($stagingSource.Contains('Sentry deploy: skipped because -SkipSmoke was requested.')) "SkipSmoke does not explicitly skip Sentry deploy reporting."

$remoteSource = Get-Content -Raw (Join-Path $PSScriptRoot "lib\tm_sentry_release_remote.py")
Assert-True (-not $remoteSource.Contains('private-test-value')) "A test token leaked into the remote reporter."
Assert-True ($remoteSource.Contains('runtime_token_lines=0')) "Remote preflight does not report the runtime isolation result."

Write-Host "TM Sentry release tests passed."
