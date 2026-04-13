param(
    [string]$HostAlias = "vps",
    [switch]$SkipStagingVerify,
    [switch]$SkipProdVerify,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"
$promoteScript = Join-Path $PSScriptRoot "promote_tm_staging_to_prod.ps1"

if (-not (Test-Path $verifyScript)) {
    throw "Missing verify script: $verifyScript"
}

if (-not (Test-Path $promoteScript)) {
    throw "Missing promote script: $promoteScript"
}

$expectedArtifactSha = $null
$expectedGitSha = $null

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
    & pwsh -File $promoteScript -HostAlias $HostAlias -DryRun
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
    $expectedGitSha = [string]$stagingVerify.release.gitSha
}

if ($SkipStagingVerify -and -not $SkipProdVerify) {
    $stagingManifestJson = & pwsh -File $verifyScript -Environment staging -RequireReleaseManifest -OutputJson
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read staging release manifest. Promote aborted."
    }
    $stagingManifest = $stagingManifestJson | ConvertFrom-Json
    $expectedArtifactSha = [string]$stagingManifest.release.artifactSha256
    $expectedGitSha = [string]$stagingManifest.release.gitSha
}

& pwsh -File $promoteScript -HostAlias $HostAlias
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

    if (-not [string]::IsNullOrWhiteSpace($expectedArtifactSha)) {
        if ($prodArtifactSha -ne $expectedArtifactSha) {
            throw "Prod artifact hash mismatch after promote. staging=$expectedArtifactSha prod=$prodArtifactSha"
        }
        if ($prodGitSha -ne $expectedGitSha) {
            throw "Prod git sha mismatch after promote. staging=$expectedGitSha prod=$prodGitSha"
        }
    }

    Write-Host "Release gate OK"
    Write-Host "Artifact    : sha256=$prodArtifactSha git=$prodGitSha"
}
