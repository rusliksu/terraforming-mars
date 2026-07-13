param(
    [ValidateSet("staging", "prod", "preview")]
    [string]$Environment = "staging",
    [string]$HostAlias = "hostkey-codex",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [string]$SourceRoot,
    [string]$ExpectedGitSha,
    [string]$ExpectedReleaseBaselineBase64,
    [switch]$AllowDirtySource,
    [switch]$AllowPrimaryWorkingTree,
    [switch]$AllowDirectProdDeploy,
    [switch]$ForceRedeploy,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")
. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

Assert-TmReleaseCasBaselineBase64 -Token $ExpectedReleaseBaselineBase64
if (-not $DryRun -and $Environment -in @("staging", "prod") -and [string]::IsNullOrWhiteSpace($ExpectedReleaseBaselineBase64)) {
    throw "ExpectedReleaseBaselineBase64 is required for staging/prod deploy CAS protection."
}

function Copy-RemoteFile {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )

    Invoke-TmScpUpload -HostAlias $HostAlias -LocalPath $LocalPath -RemotePath $RemotePath
}

function Invoke-RemoteCommand {
    param(
        [string]$Command,
        [string]$InputText = "",
        [int]$TimeoutSeconds = 1800
    )

    if ([string]::IsNullOrEmpty($InputText)) {
        return Invoke-TmSshCommand -HostAlias $HostAlias -RemoteCommand $Command
    }

    return Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $InputText
}

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

function Test-CleanGitCheckout {
    param(
        [string]$RepoRoot
    )

    if (-not (Test-Path -LiteralPath $RepoRoot)) {
        return $false
    }

    $gitTopLevel = Get-GitCommandValue -RepoRoot $RepoRoot -GitArgs @("rev-parse", "--show-toplevel")
    if ([string]::IsNullOrWhiteSpace($gitTopLevel)) {
        return $false
    }

    if ((Get-NormalizedPath -PathValue $gitTopLevel) -ne (Get-NormalizedPath -PathValue $RepoRoot)) {
        return $false
    }

    return [string]::IsNullOrWhiteSpace((Get-GitStatusPorcelain -RepoRoot $RepoRoot))
}

function Test-DefaultSourceCheckout {
    param(
        [string]$RepoRoot
    )

    if (-not (Test-CleanGitCheckout -RepoRoot $RepoRoot)) {
        return $false
    }

    $headSha = Get-GitCommandValue -RepoRoot $RepoRoot -GitArgs @("rev-parse", "HEAD")
    $originMainSha = Get-GitCommandValue -RepoRoot $RepoRoot -GitArgs @("rev-parse", "origin/main")
    if ([string]::IsNullOrWhiteSpace($headSha) -or [string]::IsNullOrWhiteSpace($originMainSha)) {
        return $false
    }

    return $headSha -eq $originMainSha
}

function Resolve-DefaultSourceRoot {
    param(
        [string]$WorkspaceRoot,
        [string]$RepoRoot
    )

    $candidates = @(
        (Join-Path $WorkspaceRoot "terraforming-mars-release-main"),
        (Join-Path $WorkspaceRoot "terraforming-mars-main-clean"),
        $RepoRoot
    )

    foreach ($candidate in $candidates) {
        if (Test-DefaultSourceCheckout -RepoRoot $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    return $RepoRoot
}

function Get-JsonFile {
    param(
        [string]$Path
    )

    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
}

function Get-NormalizedFileSha256 {
    param(
        [string]$Path
    )

    $content = Get-Content -LiteralPath $Path -Raw
    $normalized = $content -replace "`r`n", "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
    } finally {
        $sha256.Dispose()
    }
}

function Assert-TmExpectedGitSha {
    param(
        [string]$Expected,
        [string]$Actual,
        [string]$Context
    )

    if ([string]::IsNullOrWhiteSpace($Expected)) {
        return
    }
    if ($Expected -notmatch '^[0-9a-fA-F]{40}$') {
        throw "ExpectedGitSha must be a full 40-character git SHA."
    }
    if ($Actual -notmatch '^[0-9a-fA-F]{40}$') {
        throw "$Context did not resolve to a full 40-character git SHA."
    }
    if (-not $Actual.Equals($Expected, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Context drifted from the intended release SHA. expected=$Expected actual=$Actual"
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$tmWorkspaceRoot = Split-Path -Parent $repoRoot
$safeDefaultSourceRoot = Join-Path $tmWorkspaceRoot "terraforming-mars-release-main"
$safeAlternateSourceRoot = Join-Path $tmWorkspaceRoot "terraforming-mars-main-clean"

$resolvedSourceRoot = if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
    Resolve-DefaultSourceRoot -WorkspaceRoot $tmWorkspaceRoot -RepoRoot $repoRoot
} else {
    (Resolve-Path $SourceRoot).Path
}

$normalizedRepoRoot = Get-NormalizedPath -PathValue (Resolve-Path $repoRoot).Path
$normalizedSourceRoot = Get-NormalizedPath -PathValue $resolvedSourceRoot
$normalizedSafeSourceRoots = @(
    (Get-NormalizedPath -PathValue $safeDefaultSourceRoot),
    (Get-NormalizedPath -PathValue $safeAlternateSourceRoot)
)

if ($Environment -eq "prod" -and -not $AllowDirectProdDeploy) {
    throw "Direct prod deploy is blocked. Deploy to staging first and then run scripts/release_tm_prod.ps1 or scripts/promote_tm_staging_to_prod.ps1. Pass -AllowDirectProdDeploy only for an explicit emergency override."
}

if ($normalizedSourceRoot -eq $normalizedRepoRoot -and $normalizedRepoRoot -notin $normalizedSafeSourceRoots -and -not $AllowPrimaryWorkingTree) {
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

$gitSha = Get-GitCommandValue -RepoRoot $resolvedSourceRoot -GitArgs @("rev-parse", "HEAD")
$gitBranch = Get-GitCommandValue -RepoRoot $resolvedSourceRoot -GitArgs @("rev-parse", "--abbrev-ref", "HEAD")
Assert-TmExpectedGitSha -Expected $ExpectedGitSha -Actual $gitSha -Context "SourceRoot HEAD"
$expectedBuildHead = if ([string]::IsNullOrWhiteSpace($gitSha)) { "" } else { $gitSha }

$buildDir = Join-Path $resolvedSourceRoot "build"
$assetsDir = Join-Path $resolvedSourceRoot "assets"
$eloDir = Join-Path $resolvedSourceRoot "elo"
$packageJsonPath = Join-Path $resolvedSourceRoot "package.json"
$packageLockPath = Join-Path $resolvedSourceRoot "package-lock.json"
$eloSourceFiles = @(
    "index.html",
    "audit_player_names.py",
    "elo-api.js",
    "elo_aliases.py",
    "excluded_games.json",
    "fix_elo_dupes.py",
    "import_gamedb_to_elo.py",
    "migrate_elo_nicknames.py",
    "player_name_aliases.json",
    "player_name_overrides.json",
    "tm-sync-elo.py"
)
$generatedSettingsPath = Join-Path $resolvedSourceRoot "src\\genfiles\\settings.json"

if (-not (Test-Path (Join-Path $buildDir "main.js"))) {
    throw "Source build is missing build/main.js in $resolvedSourceRoot. Run the build there before deploy."
}
if (-not (Test-Path (Join-Path $buildDir "src/server/server.js"))) {
    throw "Source build is missing build/src/server/server.js in $resolvedSourceRoot. Run the build there before deploy."
}
if (-not (Test-Path (Join-Path $assetsDir "index.html"))) {
    throw "Source assets are missing assets/index.html in $resolvedSourceRoot."
}
if (-not (Test-Path $packageJsonPath)) {
    throw "Source package manifest is missing package.json in $resolvedSourceRoot."
}
if (-not (Test-Path $packageLockPath)) {
    throw "Source dependency lockfile is missing package-lock.json in $resolvedSourceRoot."
}
foreach ($eloFile in $eloSourceFiles) {
    if (-not (Test-Path (Join-Path $eloDir $eloFile))) {
        throw "Source elo file is missing elo/$eloFile in $resolvedSourceRoot."
    }
}
if (-not (Test-Path $generatedSettingsPath)) {
    throw "Source build metadata is missing src/genfiles/settings.json in $resolvedSourceRoot. Run the build there before deploy."
}

$generatedSettings = Get-JsonFile -Path $generatedSettingsPath
$generatedBuildHead = [string]$generatedSettings.head
if ([string]::IsNullOrWhiteSpace($generatedBuildHead)) {
    throw "Build metadata in $generatedSettingsPath is missing head. Run the build there before deploy."
}
if (-not $expectedBuildHead.StartsWith($generatedBuildHead, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Build metadata is stale for release.`nSourceRoot: $resolvedSourceRoot`nCurrent git HEAD: $expectedBuildHead`nGenerated settings head: $generatedBuildHead`nRun the build in this checkout after the latest commit before deploy."
}

$runtimeRoot = switch ($Environment) {
    "staging" { "/home/openclaw/tm-runtime/staging" }
    "preview" { "/home/openclaw/tm-runtime/preview" }
    default { "/home/openclaw/tm-runtime/prod" }
}
$currentLink = "$runtimeRoot/current"
$legacyRoot = switch ($Environment) {
    "staging" { "/home/openclaw/terraforming-mars-staging" }
    "preview" { "/home/openclaw/terraforming-mars-preview" }
    default { "/home/openclaw/terraforming-mars" }
}

$serviceName = switch ($Environment) {
    "staging" { "tm-server-staging" }
    "preview" { "tm-server-preview" }
    default { "tm-server" }
}
$eloServiceName = if ($Environment -eq "prod") {
    "tm-elo"
} else {
    ""
}

$healthUrl = switch ($Environment) {
    "staging" { "http://127.0.0.1:8084" }
    "preview" { "http://127.0.0.1:8086" }
    default { "http://127.0.0.1:8081" }
}
$eloHealthUrl = if ($Environment -eq "prod") {
    "http://127.0.0.1:8082/api/elo-submit"
} else {
    ""
}

$runToken = New-TmReleaseRunToken
$releaseWorkRoot = Join-Path $env:TEMP "tm-$Environment-release-work-$runToken"
$releasePayloadRoot = Join-Path $releaseWorkRoot "payload"
$payloadArchiveName = "tm-$Environment-payload-$runToken.tar.gz"
$payloadArchivePath = Join-Path $releaseWorkRoot $payloadArchiveName
$archiveName = "tm-$Environment-release-$runToken.tar.gz"
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

$payloadBuildDir = Join-Path $releasePayloadRoot "build"
$payloadAssetsDir = Join-Path $releasePayloadRoot "assets"
New-Item -ItemType Directory -Path $payloadBuildDir -Force | Out-Null
New-Item -ItemType Directory -Path $payloadAssetsDir -Force | Out-Null
Copy-Item -Path (Join-Path $buildDir "*") -Destination $payloadBuildDir -Recurse -Force
Copy-Item -Path (Join-Path $assetsDir "*") -Destination $payloadAssetsDir -Recurse -Force
Copy-Item -LiteralPath $packageJsonPath -Destination (Join-Path $releasePayloadRoot "package.json") -Force
Copy-Item -LiteralPath $packageLockPath -Destination (Join-Path $releasePayloadRoot "package-lock.json") -Force
$eloPayloadDir = Join-Path $releasePayloadRoot "elo"
New-Item -ItemType Directory -Path $eloPayloadDir -Force | Out-Null
foreach ($eloFile in $eloSourceFiles) {
    Copy-Item -LiteralPath (Join-Path $eloDir $eloFile) -Destination (Join-Path $eloPayloadDir $eloFile) -Force
}
$buildMainJs = Join-Path $buildDir "main.js"
$buildMainJsItem = Get-Item -LiteralPath $buildMainJs
$buildMainJsTimestampUtc = $buildMainJsItem.LastWriteTimeUtc
$buildMainJsMtimeUtc = $buildMainJsTimestampUtc.ToString("o")
$packagedAtUtc = (Get-Date).ToUniversalTime().ToString("o")

Push-Location $releaseWorkRoot
try {
    & tar.exe -czf $payloadArchiveName -C $releasePayloadRoot build assets elo package.json package-lock.json
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create payload archive."
    }
    $artifactSha256 = (Get-FileHash -LiteralPath $payloadArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    $dependencySha256 = Get-NormalizedFileSha256 -Path $packageLockPath

    $releaseManifest = [ordered]@{
        schemaVersion = 1
        environment = $Environment
        artifactSha256 = $artifactSha256
        dependencySha256 = $dependencySha256
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

    & tar.exe -czf $archiveName -C $releasePayloadRoot build assets elo package.json package-lock.json
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create deploy archive."
    }
} finally {
    Pop-Location
}

$remoteScript = @'
set -euo pipefail

archive="__ARCHIVE__"
runtime_root="__RUNTIME_ROOT__"
current_link="__CURRENT_LINK__"
legacy_root="__LEGACY_ROOT__"
service="__SERVICE__"
elo_service="__ELO_SERVICE__"
health_url="__HEALTH__"
elo_health_url="__ELO_HEALTH__"
expected_artifact_sha="__ARTIFACT_SHA__"
expected_git_sha="__GIT_SHA__"
environment="__ENV__"
force_redeploy="__FORCE_REDEPLOY__"
candidate_source_tree_clean="__SOURCE_TREE_CLEAN__"
expected_release_baseline_b64="__EXPECTED_RELEASE_BASELINE_B64__"
run_token="__RUN_TOKEN__"
release_url="${health_url%/}/release.json"
release_url_fallback="${health_url%/}/assets/release.json"
release_root="/tmp/__ARCHIVE_BASE__"
release_unpack_dir="$release_root/release"
releases_root="$runtime_root/releases"
shared_root="$runtime_root/shared"
deps_root="$shared_root/deps"
dependency_sha="__DEPENDENCY_SHA__"
new_release_dir=""
previous_current=""
elo_files="index.html audit_player_names.py elo-api.js elo_aliases.py excluded_games.json fix_elo_dupes.py import_gamedb_to_elo.py migrate_elo_nicknames.py player_name_aliases.json player_name_overrides.json tm-sync-elo.py"
deploy_lock_file="/home/openclaw/tm-runtime/.deploy.lock"
deploy_lock_info="/home/openclaw/tm-runtime/.deploy.lock.info"

assert_release_cas() {
  local baseline_b64="$1"
  local runtime_base="$2"
  [ -n "$baseline_b64" ] || return 0
  TM_RELEASE_CAS_BASELINE_B64="$baseline_b64" python3 - "$runtime_base" <<'PY'
import base64
import json
import os
import pathlib
import sys


def fail():
    print("Release CAS baseline drifted or could not be read.", file=sys.stderr)
    raise SystemExit(46)


try:
    expected = json.loads(base64.b64decode(os.environ["TM_RELEASE_CAS_BASELINE_B64"], validate=True))
    if expected.get("schema") != "TmReleaseCasBaselineV1":
        fail()
    runtime_base = pathlib.Path(sys.argv[1])

    def read_state(environment):
        current = runtime_base / environment / "current"
        target = str(current.resolve(strict=False)) if current.exists() or current.is_symlink() else ""
        manifest_path = current / "assets" / "release.json"
        git_sha = ""
        artifact_sha = ""
        if manifest_path.is_file():
            manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
            if not isinstance(manifest, dict):
                fail()
            git_sha = manifest.get("gitSha", "")
            artifact_sha = manifest.get("artifactSha256", "")
            if not isinstance(git_sha, str) or not isinstance(artifact_sha, str):
                fail()
        return {
            "currentTarget": target,
            "gitSha": git_sha.lower(),
            "artifactSha256": artifact_sha.lower(),
        }

    for environment in ("prod", "staging"):
        expected_state = expected.get("environments", {}).get(environment)
        if not isinstance(expected_state, dict) or read_state(environment) != expected_state:
            fail()
except SystemExit:
    raise
except Exception:
    fail()
PY
}

is_matching_clean_release() {
  local release_json="$1"
  local expected_environment="$2"
  local expected_sha="$3"
  printf '%s' "$release_json" | python3 -c '
import json
import sys

expected_environment = sys.argv[1]
expected_sha = sys.argv[2]
data = json.load(sys.stdin)
matches = (
    isinstance(data, dict)
    and data.get("environment") == expected_environment
    and data.get("gitSha") == expected_sha
    and type(data.get("sourceTreeClean")) is bool
    and data.get("sourceTreeClean") is True
)
raise SystemExit(0 if matches else 1)
' "$expected_environment" "$expected_sha"
}

mkdir -p "$(dirname "$deploy_lock_file")"
exec 9>"$deploy_lock_file"
if ! flock -n 9; then
  echo "Another TM deploy or promote is already running." >&2
  if [ -f "$deploy_lock_info" ]; then
    cat "$deploy_lock_info" >&2 || true
  fi
  rm -f "$archive"
  exit 75
fi
{
  echo "operation=deploy"
  echo "environment=__ENV__"
  echo "service=$service"
  echo "git_sha=$expected_git_sha"
  echo "artifact_sha=$expected_artifact_sha"
  echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "pid=$$"
} > "$deploy_lock_info"
trap 'rm -f "$deploy_lock_info"' EXIT

set +e
assert_release_cas "$expected_release_baseline_b64" "/home/openclaw/tm-runtime"
cas_exit=$?
set -e
if [ "$cas_exit" -ne 0 ]; then
  rm -f "$archive"
  exit 46
fi

rollback() {
  if [ -n "$previous_current" ]; then
    ln -sfn "$previous_current" "$current_link"
  else
    rm -f "$current_link"
  fi
  if [ -n "$new_release_dir" ] && [ -d "$new_release_dir" ] && [ "$new_release_dir" != "$previous_current" ]; then
    rm -rf "$new_release_dir"
  fi
  systemctl --user restart "$service" || true
  if [ -n "$elo_service" ]; then
    systemctl --user restart "$elo_service" || true
  fi
}

if ! systemctl --user cat "$service" | grep -F "WorkingDirectory=$current_link" >/dev/null; then
  echo "Service $service is not pointed at $current_link. Run sync_tm_runtime_services.ps1 first." >&2
  exit 1
fi

if [ -n "$elo_service" ]; then
  if ! systemctl --user cat "$elo_service" | grep -F "$current_link/elo/elo-api.js" >/dev/null; then
    echo "Service $elo_service is not pointed at $current_link. Run sync_tm_runtime_services.ps1 first." >&2
    exit 1
  fi
fi

if [ "$environment" = "staging" ] && [ "$force_redeploy" != "1" ] && [ "$candidate_source_tree_clean" = "true" ]; then
  served_noop_release_json=""
  if served_noop_release_json="$(curl -fsS "$release_url" 2>/dev/null || curl -fsS "$release_url_fallback" 2>/dev/null)"; then
    if is_matching_clean_release "$served_noop_release_json" "$environment" "$expected_git_sha"; then
      echo "Deploy no-op"
      echo "environment=$environment"
      echo "reason=staging already serves the exact clean source SHA"
      echo "git_sha=$expected_git_sha"
      rm -rf "$release_root"
      rm -f "$archive"
      exit 0
    fi
  fi
fi

mkdir -p "$runtime_root" "$releases_root" "$shared_root/db" "$shared_root/logs" "$shared_root/elo" "$deps_root"

if [ -d "$legacy_root/db" ] && [ ! -e "$shared_root/db/game.db" ]; then
  rsync -a "$legacy_root/db/" "$shared_root/db/"
fi
if [ -d "$legacy_root/logs" ] && [ -z "$(ls -A "$shared_root/logs" 2>/dev/null || true)" ]; then
  rsync -a "$legacy_root/logs/" "$shared_root/logs/"
fi
for data_file in elo-data.json data.json solo-records.json stats.json; do
  if [ -f "$legacy_root/elo/$data_file" ] && [ ! -e "$shared_root/elo/$data_file" ]; then
    cp "$legacy_root/elo/$data_file" "$shared_root/elo/$data_file"
  fi
done
if [ ! -e "$shared_root/elo/stats.json" ]; then
  printf '{"generatedAt":null,"gameCount":0,"playerGameCount":0,"players":[],"generationRecords":[],"records":[],"cardStats":[]}\n' > "$shared_root/elo/stats.json"
fi

if [ -L "$current_link" ]; then
  previous_current="$(readlink -f "$current_link" || true)"
elif [ -d "$legacy_root" ]; then
  previous_current="$legacy_root"
fi

rm -rf "$release_root"
mkdir -p "$release_unpack_dir"
tar -xzf "$archive" -C "$release_unpack_dir"

test -f "$release_unpack_dir/build/main.js"
test -f "$release_unpack_dir/build/src/server/server.js"
test -f "$release_unpack_dir/assets/index.html"
test -f "$release_unpack_dir/elo/index.html"
test -f "$release_unpack_dir/elo/elo-api.js"
test -f "$release_unpack_dir/package.json"
test -f "$release_unpack_dir/package-lock.json"

deps_dir="$deps_root/$dependency_sha"
if [ ! -d "$deps_dir/node_modules" ]; then
  deps_tmp="$deps_root/.tmp-$dependency_sha-$$"
  rm -rf "$deps_tmp"
  mkdir -p "$deps_tmp"
  cp "$release_unpack_dir/package.json" "$deps_tmp/package.json"
  cp "$release_unpack_dir/package-lock.json" "$deps_tmp/package-lock.json"
  (
    cd "$deps_tmp"
    npm ci --include=optional
  )
  mkdir -p "$deps_dir"
  mv "$deps_tmp/node_modules" "$deps_dir/node_modules"
  cp "$deps_tmp/package.json" "$deps_dir/package.json"
  cp "$deps_tmp/package-lock.json" "$deps_dir/package-lock.json"
  rm -rf "$deps_tmp"
fi

ts="$(date +%Y%m%d%H%M%S)"
release_name="${ts}-${expected_git_sha}-${run_token}"
new_release_dir="$releases_root/$release_name"

rm -rf "$new_release_dir"
mkdir -p "$new_release_dir"
mv "$release_unpack_dir/build" "$new_release_dir/build"
mv "$release_unpack_dir/assets" "$new_release_dir/assets"
mv "$release_unpack_dir/package.json" "$new_release_dir/package.json"
mv "$release_unpack_dir/package-lock.json" "$new_release_dir/package-lock.json"
mkdir -p "$new_release_dir/elo"
for file in $elo_files; do
  cp "$release_unpack_dir/elo/$file" "$new_release_dir/elo/$file"
done

ln -sfn "$shared_root/db" "$new_release_dir/db"
ln -sfn "$shared_root/logs" "$new_release_dir/logs"
ln -sfn "$shared_root/elo/elo-data.json" "$new_release_dir/elo/elo-data.json"
ln -sfn "$shared_root/elo/data.json" "$new_release_dir/elo/data.json"
ln -sfn "$shared_root/elo/solo-records.json" "$new_release_dir/elo/solo-records.json"
ln -sfn "$shared_root/elo/stats.json" "$new_release_dir/elo/stats.json"
ln -sfn "$deps_dir/node_modules" "$new_release_dir/node_modules"

if [ "__ENV__" = "prod" ]; then
  scripts_dir="/home/openclaw/scripts"
  mkdir -p "$scripts_dir"
  cp "$new_release_dir/elo/tm-sync-elo.py" "$scripts_dir/tm-sync-elo.py"
  cp "$new_release_dir/elo/elo_aliases.py" "$scripts_dir/elo_aliases.py"
  cp "$new_release_dir/elo/player_name_aliases.json" "$scripts_dir/player_name_aliases.json"
  cp "$new_release_dir/elo/player_name_overrides.json" "$scripts_dir/player_name_overrides.json"
  cp "$new_release_dir/elo/excluded_games.json" "$scripts_dir/excluded_games.json"
  chmod 755 "$scripts_dir/tm-sync-elo.py" "$scripts_dir/elo_aliases.py"
fi

ln -sfn "$new_release_dir" "$current_link"

if ! systemctl --user restart "$service"; then
  echo "Restart failed, rolling back." >&2
  rollback
  exit 1
fi

if [ -n "$elo_service" ]; then
  if ! systemctl --user restart "$elo_service"; then
    echo "ELO restart failed, rolling back." >&2
    rollback
    exit 1
  fi
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

if [ -n "$elo_health_url" ]; then
  elo_healthy=0
  for attempt in $(seq 1 10); do
    if curl -fsS "$elo_health_url" >/dev/null 2>&1; then
      elo_healthy=1
      break
    fi
    sleep 2
  done

  if [ "$elo_healthy" -ne 1 ]; then
    echo "ELO health check failed, rolling back." >&2
    rollback
    exit 1
  fi
fi

served_release_json=""
if ! served_release_json="$(curl -fsS "$release_url")"; then
  if ! served_release_json="$(curl -fsS "$release_url_fallback")"; then
  echo "Release manifest fetch failed, rolling back." >&2
  rollback
  exit 1
  fi
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
echo "runtime_root=$runtime_root"
echo "current_link=$current_link"
echo "legacy_root=$legacy_root"
echo "release_dir=$new_release_dir"
echo "previous_current=$previous_current"
echo "health_url=$health_url"
echo "dependency_sha=$dependency_sha"
echo "dependencies_dir=$deps_dir"
if [ -n "$elo_service" ]; then
echo "elo_service=$elo_service"
echo "elo_health_url=$elo_health_url"
fi
echo "release_url=$release_url"
echo "artifact_sha=$served_artifact_sha"
echo "git_sha=$served_git_sha"

rm -rf "$release_root"
rm -f "$archive"
'@

$remoteScript = $remoteScript.Replace("__ARCHIVE__", $remoteArchive)
$remoteScript = $remoteScript.Replace("__RUNTIME_ROOT__", $runtimeRoot)
$remoteScript = $remoteScript.Replace("__CURRENT_LINK__", $currentLink)
$remoteScript = $remoteScript.Replace("__LEGACY_ROOT__", $legacyRoot)
$remoteScript = $remoteScript.Replace("__SERVICE__", $serviceName)
$remoteScript = $remoteScript.Replace("__ELO_SERVICE__", $eloServiceName)
$remoteScript = $remoteScript.Replace("__HEALTH__", $healthUrl)
$remoteScript = $remoteScript.Replace("__ELO_HEALTH__", $eloHealthUrl)
$remoteScript = $remoteScript.Replace("__ARTIFACT_SHA__", $artifactSha256)
$remoteScript = $remoteScript.Replace("__DEPENDENCY_SHA__", $dependencySha256)
$remoteScript = $remoteScript.Replace("__GIT_SHA__", $gitSha)
$remoteScript = $remoteScript.Replace("__FORCE_REDEPLOY__", $(if ($ForceRedeploy) { "1" } else { "0" }))
$remoteScript = $remoteScript.Replace("__SOURCE_TREE_CLEAN__", $(if ([string]::IsNullOrWhiteSpace($gitStatus)) { "true" } else { "false" }))
$remoteScript = $remoteScript.Replace("__EXPECTED_RELEASE_BASELINE_B64__", $ExpectedReleaseBaselineBase64)
$remoteScript = $remoteScript.Replace("__RUN_TOKEN__", $runToken)
$remoteScript = $remoteScript.Replace("__ARCHIVE_BASE__", $archiveBase)
$remoteScript = $remoteScript.Replace("__ENV__", $Environment)

Write-Host "Environment : $Environment"
Write-Host "Source      : $resolvedSourceRoot"
Write-Host "RuntimeRoot : $runtimeRoot"
Write-Host "CurrentLink : $currentLink"
Write-Host "LegacyRoot  : $legacyRoot"
Write-Host "Service     : $serviceName"
Write-Host "Health      : $healthUrl"
Write-Host "Remote host : $HostAlias"
Write-Host "Archive     : $archivePath"
Write-Host "Artifact    : sha256=$artifactSha256 git=$gitSha deps=$dependencySha256"

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Remote script:"
    Write-Host $remoteScript
    exit 0
}

try {
    Write-Host "Uploading archive to $HostAlias`:$remoteArchive"
    Copy-RemoteFile -LocalPath $archivePath -RemotePath $remoteArchive

    Write-Host "Applying release on $HostAlias"
    $remoteScriptLf = $remoteScript -replace "`r`n", "`n"
    Invoke-RemoteCommand -Command "bash -s" -InputText $remoteScriptLf -TimeoutSeconds 3600
} finally {
    if (Test-Path $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    if (Test-Path $releaseWorkRoot) {
        Remove-Item -LiteralPath $releaseWorkRoot -Recurse -Force
    }
}
