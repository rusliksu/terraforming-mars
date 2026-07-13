param(
    [string]$HostAlias = "hostkey-codex",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [ValidateSet("all", "prod", "staging")]
    [string]$Environment = "all",
    [int]$KeepNewestReleases = 3,
    [int]$KeepLegacySnapshots = 2,
    [int]$KeepCheckoutArtifactSnapshots = 2,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

if ($KeepNewestReleases -lt 1) {
    throw "KeepNewestReleases must be at least 1."
}
if ($KeepLegacySnapshots -lt 0) {
    throw "KeepLegacySnapshots cannot be negative."
}
if ($KeepCheckoutArtifactSnapshots -lt 0) {
    throw "KeepCheckoutArtifactSnapshots cannot be negative."
}

function Write-Utf8NoBomFile {
    param(
        [string]$Path,
        [string]$Content
    )

    $normalized = $Content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($Path, $normalized, [System.Text.UTF8Encoding]::new($false))
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

$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

environment="__ENVIRONMENT__"
keep_newest_releases="__KEEP_NEWEST_RELEASES__"
keep_legacy_snapshots="__KEEP_LEGACY_SNAPSHOTS__"
keep_checkout_artifacts="__KEEP_CHECKOUT_ARTIFACTS__"
dry_run="__DRY_RUN__"

join_csv() {
  if [ "$#" -eq 0 ]; then
    echo "-"
    return
  fi

  local first=1
  for item in "$@"; do
    if [ "$first" -eq 1 ]; then
      printf '%s' "$item"
      first=0
    else
      printf ',%s' "$item"
    fi
  done
  printf '\n'
}

add_unique() {
  local value="$1"
  shift
  local existing
  for existing in "$@"; do
    if [ "$existing" = "$value" ]; then
      return 1
    fi
  done
  return 0
}

get_dependency_sha() {
  local release_dir="$1"
  local release_manifest="$release_dir/assets/release.json"
  local package_lock="$release_dir/package-lock.json"
  local dep_sha=""

  if [ -f "$release_manifest" ]; then
    dep_sha="$(python3 - "$release_manifest" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, encoding='utf-8') as handle:
    data = json.load(handle)
print(data.get('dependencySha256', ''))
PY
)"
  fi

  if [ -z "$dep_sha" ] && [ -f "$package_lock" ]; then
    dep_sha="$(python3 - "$package_lock" <<'PY'
import hashlib
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding='utf-8').replace('\r\n', '\n')
print(hashlib.sha256(text.encode('utf-8')).hexdigest())
PY
)"
  fi

  printf '%s' "$dep_sha"
}

prune_env() {
  local env_name="$1"
  local current_link="$2"
  local service="$3"
  local elo_service="$4"
  local runtime_root="/home/openclaw/tm-runtime/$env_name"
  local releases_root="$runtime_root/releases"
  local deps_root="$runtime_root/shared/deps"

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

  if [ ! -L "$current_link" ]; then
    echo "Expected current symlink at $current_link" >&2
    exit 1
  fi

  if [ ! -d "$releases_root" ]; then
    echo "Missing releases root for $env_name: $releases_root" >&2
    exit 1
  fi

  mkdir -p "$deps_root"

  local current_target
  current_target="$(readlink -f "$current_link")"
  local current_name
  current_name="$(basename "$current_target")"

  mapfile -t release_names < <(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
  if [ "${#release_names[@]}" -eq 0 ]; then
    echo "No releases found under $releases_root" >&2
    exit 1
  fi

  local previous_name=""
  local candidate
  for candidate in "${release_names[@]}"; do
    if [ "$candidate" != "$current_name" ]; then
      previous_name="$candidate"
      break
    fi
  done

  local keep_releases=()
  if add_unique "$current_name" "${keep_releases[@]}"; then
    keep_releases+=("$current_name")
  fi
  if [ -n "$previous_name" ] && add_unique "$previous_name" "${keep_releases[@]}"; then
    keep_releases+=("$previous_name")
  fi

  local kept_newest=0
  for candidate in "${release_names[@]}"; do
    if [ "$kept_newest" -ge "$keep_newest_releases" ]; then
      break
    fi
    if add_unique "$candidate" "${keep_releases[@]}"; then
      keep_releases+=("$candidate")
    fi
    kept_newest=$((kept_newest + 1))
  done

  local prune_releases=()
  for candidate in "${release_names[@]}"; do
    if ! add_unique "$candidate" "${keep_releases[@]}"; then
      continue
    fi
    prune_releases+=("$candidate")
  done

  local keep_dependencies=()
  local release_name
  for release_name in "${keep_releases[@]}"; do
    local release_dir="$releases_root/$release_name"
    local dep_sha
    dep_sha="$(get_dependency_sha "$release_dir")"
    if [ -n "$dep_sha" ] && add_unique "$dep_sha" "${keep_dependencies[@]}"; then
      keep_dependencies+=("$dep_sha")
    fi
  done

  mapfile -t dependency_names < <(find "$deps_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
  local prune_dependencies=()
  local dependency_name
  for dependency_name in "${dependency_names[@]}"; do
    if [[ "$dependency_name" == .tmp-* ]]; then
      prune_dependencies+=("$dependency_name")
      continue
    fi
    if ! add_unique "$dependency_name" "${keep_dependencies[@]}"; then
      continue
    fi
    prune_dependencies+=("$dependency_name")
  done

  echo "environment=$env_name"
  echo "current_release=$current_name"
  echo "previous_release=$(if [ -n "$previous_name" ]; then printf '%s' "$previous_name"; else printf '%s' '-'; fi)"
  echo "keep_releases=$(join_csv "${keep_releases[@]}")"
  echo "prune_releases=$(join_csv "${prune_releases[@]}")"
  echo "keep_dependencies=$(join_csv "${keep_dependencies[@]}")"
  echo "prune_dependencies=$(join_csv "${prune_dependencies[@]}")"

  if [ "$dry_run" = "1" ]; then
    return
  fi

  for release_name in "${prune_releases[@]}"; do
    rm -rf "$releases_root/$release_name"
  done
  for dependency_name in "${prune_dependencies[@]}"; do
    rm -rf "$deps_root/$dependency_name"
  done
}

prune_series() {
  local label="$1"
  local pattern="$2"
  local keep_count="$3"
  mapfile -t items < <(find /home/openclaw -maxdepth 1 -type d -name "$pattern" -printf '%f\n' | sort -r)

  local keep_items=()
  local prune_items=()
  local index=0
  local item
  for item in "${items[@]}"; do
    if [ "$index" -lt "$keep_count" ]; then
      keep_items+=("$item")
    else
      prune_items+=("$item")
    fi
    index=$((index + 1))
  done

  echo "${label}_keep=$(join_csv "${keep_items[@]}")"
  echo "${label}_prune=$(join_csv "${prune_items[@]}")"

  if [ "$dry_run" = "1" ]; then
    return
  fi

  for item in "${prune_items[@]}"; do
    rm -rf "/home/openclaw/$item"
  done
}

prune_legacy_snapshots() {
  local snapshots_root="/home/openclaw/tm-legacy-checkouts"
  if [ ! -d "$snapshots_root" ]; then
    echo "legacy_checkout_snapshots_keep=-"
    echo "legacy_checkout_snapshots_prune=-"
    return
  fi

  mapfile -t items < <(find "$snapshots_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)

  local keep_items=()
  local prune_items=()
  local index=0
  local item
  for item in "${items[@]}"; do
    if [ "$index" -lt "$keep_legacy_snapshots" ]; then
      keep_items+=("$item")
    else
      prune_items+=("$item")
    fi
    index=$((index + 1))
  done

  echo "legacy_checkout_snapshots_keep=$(join_csv "${keep_items[@]}")"
  echo "legacy_checkout_snapshots_prune=$(join_csv "${prune_items[@]}")"

  if [ "$dry_run" = "1" ]; then
    return
  fi

  for item in "${prune_items[@]}"; do
    rm -rf "$snapshots_root/$item"
  done
}

echo "mode=$(if [ "$dry_run" = "1" ]; then printf '%s' 'dry-run'; else printf '%s' 'apply'; fi)"
echo "keep_newest_releases=$keep_newest_releases"
echo "keep_legacy_snapshots=$keep_legacy_snapshots"
echo "keep_checkout_artifacts=$keep_checkout_artifacts"

case "$environment" in
  all)
    prune_env "staging" "/home/openclaw/tm-runtime/staging/current" "tm-server-staging" ""
    echo "---"
    prune_env "prod" "/home/openclaw/tm-runtime/prod/current" "tm-server" "tm-elo"
    ;;
  staging)
    prune_env "staging" "/home/openclaw/tm-runtime/staging/current" "tm-server-staging" ""
    ;;
  prod)
    prune_env "prod" "/home/openclaw/tm-runtime/prod/current" "tm-server" "tm-elo"
    ;;
esac

echo "---"
prune_legacy_snapshots
prune_series "prod_checkout_artifacts" "tm-prod-checkout-artifacts-*" "$keep_checkout_artifacts"
prune_series "staging_checkout_artifacts" "tm-staging-checkout-artifacts-*" "$keep_checkout_artifacts"
'@

$remoteScript = $remoteScript.Replace("__ENVIRONMENT__", $Environment)
$remoteScript = $remoteScript.Replace("__KEEP_NEWEST_RELEASES__", $KeepNewestReleases.ToString())
$remoteScript = $remoteScript.Replace("__KEEP_LEGACY_SNAPSHOTS__", $KeepLegacySnapshots.ToString())
$remoteScript = $remoteScript.Replace("__KEEP_CHECKOUT_ARTIFACTS__", $KeepCheckoutArtifactSnapshots.ToString())
$remoteScript = $remoteScript.Replace("__DRY_RUN__", $(if ($DryRun) { "1" } else { "0" }))

Write-Host "TM runtime prune"
Write-Host "Host                    : $HostAlias"
Write-Host "Environment             : $Environment"
Write-Host "KeepNewestReleases      : $KeepNewestReleases"
Write-Host "KeepLegacySnapshots     : $KeepLegacySnapshots"
Write-Host "KeepCheckoutArtifacts   : $KeepCheckoutArtifactSnapshots"
Write-Host "Mode                    : $(if ($DryRun) { 'dry-run' } else { 'apply' })"
Write-Host ""

$tempScript = New-TemporaryFile
$remoteScriptPath = "/tmp/tm-prune-runtime-$PID.sh"

try {
    Write-Utf8NoBomFile -Path $tempScript.FullName -Content $remoteScript
    Copy-RemoteFile -LocalPath $tempScript.FullName -RemotePath $remoteScriptPath

    Invoke-RemoteCommand -Command "chmod 700 '$remoteScriptPath' && bash '$remoteScriptPath' && rm -f '$remoteScriptPath'"
} finally {
    if (Test-Path $tempScript.FullName) {
        Remove-Item -LiteralPath $tempScript.FullName -Force
    }
}
