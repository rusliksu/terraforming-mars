param(
    [ValidateSet("staging", "prod")]
    [string]$Environment = "staging",
    [string]$HostAlias = "vps",
    [string]$SourceRoot,
    [switch]$AllowDirtySource,
    [switch]$AllowPrimaryWorkingTree,
    [switch]$AllowDirectProdDeploy,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Get-GitCommandValue {
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

function Get-NormalizedPath {
    param(
        [string]$PathValue
    )

    return [System.IO.Path]::GetFullPath($PathValue).TrimEnd('\').ToLowerInvariant()
}

function Get-GitStatusPorcelain {
    param(
        [string]$RepoRoot
    )

    return Get-GitCommandValue -RepoRoot $RepoRoot -GitArgs @("status", "--short", "--untracked-files=all")
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$tmWorkspaceRoot = Split-Path -Parent $repoRoot
$safeDefaultSourceRoot = Join-Path $tmWorkspaceRoot "terraforming-mars-release-main"

$resolvedSourceRoot = if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
    if (Test-Path $safeDefaultSourceRoot) {
        (Resolve-Path $safeDefaultSourceRoot).Path
    } else {
        $repoRoot
    }
} else {
    (Resolve-Path $SourceRoot).Path
}

$normalizedRepoRoot = Get-NormalizedPath -PathValue (Resolve-Path $repoRoot).Path
$normalizedSourceRoot = Get-NormalizedPath -PathValue $resolvedSourceRoot
$normalizedSafeDefaultSourceRoot = Get-NormalizedPath -PathValue $safeDefaultSourceRoot

if ($Environment -eq "prod" -and -not $AllowDirectProdDeploy) {
    throw "Direct prod deploy is blocked. Deploy to staging first and then run scripts/release_tm_prod.ps1 or scripts/promote_tm_staging_to_prod.ps1. Pass -AllowDirectProdDeploy only for an explicit emergency override."
}

if ($normalizedSourceRoot -eq $normalizedRepoRoot -and $normalizedRepoRoot -ne $normalizedSafeDefaultSourceRoot -and -not $AllowPrimaryWorkingTree) {
    throw "SourceRoot points at the primary working tree: $resolvedSourceRoot. Use the clean release checkout or pass -AllowPrimaryWorkingTree if you intentionally want to release this exact tree."
}

$gitTopLevel = Get-GitCommandValue -RepoRoot $resolvedSourceRoot -GitArgs @("rev-parse", "--show-toplevel")
if ([string]::IsNullOrWhiteSpace($gitTopLevel)) {
    throw "SourceRoot is not a git checkout: $resolvedSourceRoot"
}
if ((Get-NormalizedPath -PathValue $gitTopLevel) -ne $normalizedSourceRoot) {
    throw "SourceRoot must point at the repository root. Got $resolvedSourceRoot but git top-level is $gitTopLevel."
}

$gitStatus = Get-GitStatusPorcelain -RepoRoot $resolvedSourceRoot
if (-not $AllowDirtySource -and -not [string]::IsNullOrWhiteSpace($gitStatus)) {
    $statusPreview = (($gitStatus -split "`r?`n") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 20) -join [Environment]::NewLine
    throw "SourceRoot has uncommitted changes and is blocked for release.`nSourceRoot: $resolvedSourceRoot`nUse a clean release checkout or pass -AllowDirtySource if you really intend to release a dirty tree.`n`n$statusPreview"
}

$buildDir = Join-Path $resolvedSourceRoot "build"
$assetsDir = Join-Path $resolvedSourceRoot "assets"

if (-not (Test-Path (Join-Path $buildDir "main.js"))) {
    throw "Source build is missing build/main.js in $resolvedSourceRoot. Run the build there before deploy."
}
if (-not (Test-Path (Join-Path $buildDir "src/server/server.js"))) {
    throw "Source build is missing build/src/server/server.js in $resolvedSourceRoot. Run the build there before deploy."
}
if (-not (Test-Path (Join-Path $assetsDir "index.html"))) {
    throw "Source assets are missing assets/index.html in $resolvedSourceRoot."
}

$targetDir = if ($Environment -eq "staging") {
    "/home/openclaw/terraforming-mars-staging"
} else {
    "/home/openclaw/terraforming-mars"
}

$serviceName = if ($Environment -eq "staging") {
    "tm-server-staging"
} else {
    "tm-server"
}

$healthUrl = if ($Environment -eq "staging") {
    "http://127.0.0.1:8084"
} else {
    "http://127.0.0.1:8081"
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$releaseWorkRoot = Join-Path $env:TEMP "tm-$Environment-release-work-$timestamp"
$releasePayloadRoot = Join-Path $releaseWorkRoot "payload"
$payloadArchiveName = "tm-$Environment-payload-$timestamp.tar.gz"
$payloadArchivePath = Join-Path $releaseWorkRoot $payloadArchiveName
$archiveName = "tm-$Environment-release-$timestamp.tar.gz"
$archivePath = Join-Path $releaseWorkRoot $archiveName
$remoteArchive = "/home/openclaw/$archiveName"
$archiveBase = [System.IO.Path]::GetFileNameWithoutExtension([System.IO.Path]::GetFileNameWithoutExtension($archiveName))

if (Test-Path $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
}
if (Test-Path $releaseWorkRoot) {
    Remove-Item -LiteralPath $releaseWorkRoot -Recurse -Force
}

Write-Host "Packaging build and assets into $archivePath"
New-Item -ItemType Directory -Path $releasePayloadRoot -Force | Out-Null

Copy-Item -Path $buildDir -Destination (Join-Path $releasePayloadRoot "build") -Recurse -Force
Copy-Item -Path $assetsDir -Destination (Join-Path $releasePayloadRoot "assets") -Recurse -Force

$gitSha = Get-GitCommandValue -RepoRoot $resolvedSourceRoot -GitArgs @("rev-parse", "HEAD")
$gitBranch = Get-GitCommandValue -RepoRoot $resolvedSourceRoot -GitArgs @("rev-parse", "--abbrev-ref", "HEAD")
$buildMainJs = Join-Path $buildDir "main.js"
$buildMainJsItem = Get-Item -LiteralPath $buildMainJs
$buildMainJsTimestampUtc = $buildMainJsItem.LastWriteTimeUtc
$buildMainJsMtimeUtc = $buildMainJsTimestampUtc.ToString("o")
$packagedAtUtc = (Get-Date).ToUniversalTime().ToString("o")

Push-Location $releaseWorkRoot
try {
    & tar.exe -czf $payloadArchiveName -C $releasePayloadRoot build assets
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create payload archive."
    }
    $artifactSha256 = (Get-FileHash -LiteralPath $payloadArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()

    $releaseManifest = [ordered]@{
        schemaVersion = 1
        artifactSha256 = $artifactSha256
        gitSha = $gitSha
        gitBranch = $gitBranch
        sourceTreeClean = [string]::IsNullOrWhiteSpace($gitStatus)
        sourceRoot = $resolvedSourceRoot
        buildMainJsMtimeUtc = $buildMainJsMtimeUtc
        packagedAtUtc = $packagedAtUtc
    }
    $releaseJsonPath = Join-Path $releasePayloadRoot "assets\\release.json"
    $releaseManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $releaseJsonPath -Encoding UTF8
    (Get-Item -LiteralPath $releaseJsonPath).LastWriteTimeUtc = $buildMainJsTimestampUtc
    (Get-Item -LiteralPath (Join-Path $releasePayloadRoot "assets")).LastWriteTimeUtc = $buildMainJsTimestampUtc

    & tar.exe -czf $archiveName -C $releasePayloadRoot build assets
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create deploy archive."
    }
} finally {
    Pop-Location
}

$remoteScript = @'
set -euo pipefail

archive="__ARCHIVE__"
target="__TARGET__"
service="__SERVICE__"
health_url="__HEALTH__"
expected_artifact_sha="__ARTIFACT_SHA__"
expected_git_sha="__GIT_SHA__"
release_url="${health_url%/}/release.json"
release_root="/tmp/__ARCHIVE_BASE__"
release_dir="$release_root/release"

rollback() {
  if [ -d "$target/build" ]; then
    rm -rf "$target/build"
  fi
  if [ -d "$target/assets" ]; then
    rm -rf "$target/assets"
  fi
  if [ -d "$backup_build" ]; then
    mv "$backup_build" "$target/build"
  fi
  if [ -d "$backup_assets" ]; then
    mv "$backup_assets" "$target/assets"
  fi
  systemctl --user restart "$service" || true
}

rm -rf "$release_root"
mkdir -p "$release_dir"
tar -xzf "$archive" -C "$release_dir"

test -f "$release_dir/build/main.js"
test -f "$release_dir/build/src/server/server.js"
test -f "$release_dir/assets/index.html"

ts="$(date +%Y%m%d%H%M%S)"
backup_build="$target/build.bak-$ts"
backup_assets="$target/assets.bak-$ts"

mv "$target/build" "$backup_build"
mv "$target/assets" "$backup_assets"
mv "$release_dir/build" "$target/build"
mv "$release_dir/assets" "$target/assets"

if ! systemctl --user restart "$service"; then
  echo "Restart failed, rolling back." >&2
  rollback
  exit 1
fi

healthy=0
for attempt in $(seq 1 20); do
  if curl -fsS -I "$health_url" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  echo "Health check failed, rolling back." >&2
  rollback
  exit 1
fi

served_release_json=""
if ! served_release_json="$(curl -fsS "$release_url")"; then
  echo "Release manifest fetch failed, rolling back." >&2
  rollback
  exit 1
fi

served_artifact_sha=""
if ! served_artifact_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("artifactSha256", ""))')"; then
  echo "Release manifest parse failed, rolling back." >&2
  rollback
  exit 1
fi

served_git_sha=""
if ! served_git_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("gitSha", ""))')"; then
  echo "Release manifest parse failed, rolling back." >&2
  rollback
  exit 1
fi

if [ -z "$served_artifact_sha" ] || [ "$served_artifact_sha" != "$expected_artifact_sha" ]; then
  echo "Served release artifact hash mismatch, rolling back." >&2
  echo "expected=$expected_artifact_sha actual=$served_artifact_sha" >&2
  rollback
  exit 1
fi

if [ -n "$expected_git_sha" ] && [ "$served_git_sha" != "$expected_git_sha" ]; then
  echo "Served release git sha mismatch, rolling back." >&2
  echo "expected=$expected_git_sha actual=$served_git_sha" >&2
  rollback
  exit 1
fi

echo "Deploy ok"
echo "environment=__ENV__"
echo "service=$service"
echo "target=$target"
echo "health_url=$health_url"
echo "release_url=$release_url"
echo "artifact_sha=$served_artifact_sha"
echo "git_sha=$served_git_sha"
echo "backup_build=$backup_build"
echo "backup_assets=$backup_assets"

rm -rf "$release_root"
rm -f "$archive"
'@

$remoteScript = $remoteScript.Replace("__ARCHIVE__", $remoteArchive)
$remoteScript = $remoteScript.Replace("__TARGET__", $targetDir)
$remoteScript = $remoteScript.Replace("__SERVICE__", $serviceName)
$remoteScript = $remoteScript.Replace("__HEALTH__", $healthUrl)
$remoteScript = $remoteScript.Replace("__ARTIFACT_SHA__", $artifactSha256)
$remoteScript = $remoteScript.Replace("__GIT_SHA__", $gitSha)
$remoteScript = $remoteScript.Replace("__ARCHIVE_BASE__", $archiveBase)
$remoteScript = $remoteScript.Replace("__ENV__", $Environment)

Write-Host "Environment : $Environment"
Write-Host "Source      : $resolvedSourceRoot"
Write-Host "Target      : $targetDir"
Write-Host "Service     : $serviceName"
Write-Host "Health      : $healthUrl"
Write-Host "Remote host : $HostAlias"
Write-Host "Archive     : $archivePath"
Write-Host "Artifact    : sha256=$artifactSha256 git=$gitSha"

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Remote script:"
    Write-Host $remoteScript
    exit 0
}

try {
    Write-Host "Uploading archive to $HostAlias`:$remoteArchive"
    & scp.exe $archivePath "${HostAlias}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upload deploy archive."
    }

    Write-Host "Applying release on $HostAlias"
    $remoteScript | & ssh.exe $HostAlias "bash -s"
    if ($LASTEXITCODE -ne 0) {
        throw "Remote deploy failed."
    }
} finally {
    if (Test-Path $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    if (Test-Path $releaseWorkRoot) {
        Remove-Item -LiteralPath $releaseWorkRoot -Recurse -Force
    }
}
