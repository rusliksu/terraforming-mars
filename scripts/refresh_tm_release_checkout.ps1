param(
    [string]$ReleaseRoot,
    [switch]$BootstrapIfMissing,
    [switch]$AllowDirtyReleaseCheckout,
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [string]$Description,
        [scriptblock]$Action
    )

    Write-Host "==> $Description"
    if ($DryRun) {
        return
    }
    & $Action
}

function Invoke-InRepo {
    param(
        [string]$RepoRoot,
        [string]$Description,
        [scriptblock]$Action
    )

    Write-Host "==> $Description"
    if ($DryRun) {
        return
    }
    Push-Location $RepoRoot
    try {
        & $Action
    } finally {
        Pop-Location
    }
}

function Get-GitValue {
    param(
        [string]$RepoRoot,
        [string[]]$GitArgs
    )

    try {
        $value = & git -C $RepoRoot @GitArgs 2>$null
        if ($LASTEXITCODE -eq 0) {
            return (($value | Out-String).Trim())
        }
    } catch {
    }

    return ""
}

function Require-Success {
    param(
        [string]$Message
    )

    if ($LASTEXITCODE -ne 0) {
        throw $Message
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$tmWorkspaceRoot = Split-Path -Parent $repoRoot

if ([string]::IsNullOrWhiteSpace($ReleaseRoot)) {
    $ReleaseRoot = Join-Path $tmWorkspaceRoot "terraforming-mars-release-main"
}

$ReleaseRoot = [System.IO.Path]::GetFullPath($ReleaseRoot)

$originUrl = Get-GitValue -RepoRoot $repoRoot -GitArgs @("remote", "get-url", "origin")
$upstreamUrl = Get-GitValue -RepoRoot $repoRoot -GitArgs @("remote", "get-url", "upstream")

if (-not (Test-Path $ReleaseRoot)) {
    if (-not $BootstrapIfMissing) {
        throw "Release checkout does not exist: $ReleaseRoot. Re-run with -BootstrapIfMissing to clone it."
    }
    if ([string]::IsNullOrWhiteSpace($originUrl)) {
        throw "Cannot bootstrap release checkout because origin remote is missing in $repoRoot."
    }

    Invoke-Step "Cloning release checkout into $ReleaseRoot" {
        & git clone $originUrl $ReleaseRoot
        Require-Success "Failed to clone release checkout."
    }
}

$gitTopLevel = Get-GitValue -RepoRoot $ReleaseRoot -GitArgs @("rev-parse", "--show-toplevel")
if ([string]::IsNullOrWhiteSpace($gitTopLevel)) {
    throw "ReleaseRoot is not a git checkout: $ReleaseRoot"
}

$gitStatus = Get-GitValue -RepoRoot $ReleaseRoot -GitArgs @("status", "--short", "--untracked-files=all")
if (-not $AllowDirtyReleaseCheckout -and -not [string]::IsNullOrWhiteSpace($gitStatus)) {
    throw "Release checkout is dirty: $ReleaseRoot`n$gitStatus`nClean it first or pass -AllowDirtyReleaseCheckout."
}

if (-not [string]::IsNullOrWhiteSpace($originUrl)) {
    $releaseOriginUrl = Get-GitValue -RepoRoot $ReleaseRoot -GitArgs @("remote", "get-url", "origin")
    if ($releaseOriginUrl -ne $originUrl) {
        Invoke-Step "Pointing release checkout origin to $originUrl" {
            & git -C $ReleaseRoot remote set-url origin $originUrl
            Require-Success "Failed to update origin remote."
        }
    }
}

if (-not [string]::IsNullOrWhiteSpace($upstreamUrl)) {
    $releaseUpstreamUrl = Get-GitValue -RepoRoot $ReleaseRoot -GitArgs @("remote", "get-url", "upstream")
    if ([string]::IsNullOrWhiteSpace($releaseUpstreamUrl)) {
        Invoke-Step "Adding upstream remote $upstreamUrl" {
            & git -C $ReleaseRoot remote add upstream $upstreamUrl
            Require-Success "Failed to add upstream remote."
        }
    } elseif ($releaseUpstreamUrl -ne $upstreamUrl) {
        Invoke-Step "Pointing release checkout upstream to $upstreamUrl" {
            & git -C $ReleaseRoot remote set-url upstream $upstreamUrl
            Require-Success "Failed to update upstream remote."
        }
    }
}

Invoke-Step "Fetching origin/main" {
    & git -C $ReleaseRoot fetch origin main
    Require-Success "Failed to fetch origin/main."
}

if (-not [string]::IsNullOrWhiteSpace($upstreamUrl)) {
    Invoke-Step "Fetching upstream/main" {
        & git -C $ReleaseRoot fetch upstream main
        Require-Success "Failed to fetch upstream/main."
    }
}

Invoke-Step "Switching release checkout to main" {
    & git -C $ReleaseRoot switch main
    Require-Success "Failed to switch release checkout to main."
}

Invoke-Step "Tracking origin/main from release checkout main" {
    & git -C $ReleaseRoot branch --set-upstream-to origin/main main
    Require-Success "Failed to set upstream tracking for main."
}

Invoke-Step "Fast-forwarding release checkout main from origin/main" {
    & git -C $ReleaseRoot pull --ff-only origin main
    Require-Success "Failed to fast-forward release checkout main."
}

if (-not $SkipInstall) {
    Invoke-InRepo -RepoRoot $ReleaseRoot -Description "Installing dependencies with npm ci" -Action {
        & npm ci
        Require-Success "npm ci failed in release checkout."
    }
}

if (-not $SkipBuild) {
    Invoke-InRepo -RepoRoot $ReleaseRoot -Description "Building release checkout with npm run build" -Action {
        & npm run build
        Require-Success "npm run build failed in release checkout."
    }
}

$headSummary = Get-GitValue -RepoRoot $ReleaseRoot -GitArgs @("show", "-s", "--format=%h %ci %s", "HEAD")

Write-Host ""
if ($DryRun) {
    Write-Host "Release checkout dry run complete"
} else {
    Write-Host "Release checkout ready"
}
Write-Host "Path        : $ReleaseRoot"
Write-Host "Head        : $headSummary"
Write-Host "Origin      : $originUrl"
if (-not [string]::IsNullOrWhiteSpace($upstreamUrl)) {
    Write-Host "Upstream    : $upstreamUrl"
}
Write-Host ""
Write-Host "Next steps:"
$deployScript = Join-Path $repoRoot "scripts\deploy_tm_staging.ps1"
$releaseScript = Join-Path $repoRoot "scripts\release_tm_prod.ps1"
Write-Host "pwsh -File $deployScript"
Write-Host "pwsh -File $releaseScript"
