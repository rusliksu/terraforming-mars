param(
    [string]$VpsHost = "vps",
    [ValidateSet("all", "prod", "staging")]
    [string]$Environment = "all",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-Ssh {
    param([string]$Command)
    & ssh $VpsHost $Command
    if ($LASTEXITCODE -ne 0) {
        throw "SSH command failed with exit code $LASTEXITCODE"
    }
}

$remoteScript = @'
set -euo pipefail

sync_env() {
  env_name="$1"
  current_link="$2"
  legacy_root="$3"
  shared_root="$4"

  if [ ! -L "$current_link" ]; then
    echo "Expected symlink current dir for $env_name at $current_link" >&2
    exit 1
  fi

  current_dir="$(readlink -f "$current_link")"
  manifest_root="$current_dir"
  if [ ! -f "$manifest_root/package-lock.json" ]; then
    manifest_root="$legacy_root"
  fi

  if [ ! -f "$manifest_root/package-lock.json" ] || [ ! -f "$manifest_root/package.json" ]; then
    echo "Missing package manifests for $env_name in $manifest_root" >&2
    exit 1
  fi

  if [ ! -d "$legacy_root/node_modules" ]; then
    echo "Missing legacy node_modules for $env_name in $legacy_root" >&2
    exit 1
  fi

  deps_root="$shared_root/deps"
  deps_sha="$(python3 - "$manifest_root/package-lock.json" <<'PY'
import hashlib
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
normalized = text.replace('\r\n', '\n')
print(hashlib.sha256(normalized.encode('utf-8')).hexdigest())
PY
)"
  deps_dir="$deps_root/$deps_sha"
  current_node_modules_target="$(readlink -f "$current_dir/node_modules" || true)"

  mkdir -p "$deps_root"
  if [ ! -d "$deps_dir/node_modules" ]; then
    deps_tmp="$deps_root/.tmp-$deps_sha-$$"
    rm -rf "$deps_tmp"
    mkdir -p "$deps_tmp/node_modules"
    rsync -a "$legacy_root/node_modules/" "$deps_tmp/node_modules/"
    cp "$manifest_root/package.json" "$deps_tmp/package.json"
    cp "$manifest_root/package-lock.json" "$deps_tmp/package-lock.json"
    mkdir -p "$deps_dir"
    mv "$deps_tmp/node_modules" "$deps_dir/node_modules"
    mv "$deps_tmp/package.json" "$deps_dir/package.json"
    mv "$deps_tmp/package-lock.json" "$deps_dir/package-lock.json"
    rm -rf "$deps_tmp"
  fi

  if [ "$manifest_root" != "$current_dir" ]; then
    cp "$manifest_root/package.json" "$current_dir/package.json"
    cp "$manifest_root/package-lock.json" "$current_dir/package-lock.json"
  fi
  ln -sfn "$deps_dir/node_modules" "$current_dir/node_modules"
  if [ -f "$current_dir/assets/release.json" ]; then
    python3 - "$current_dir/assets/release.json" "$deps_sha" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
deps_sha = sys.argv[2]
data = json.loads(path.read_text(encoding="utf-8"))
if data.get("dependencySha256") != deps_sha:
    data["dependencySha256"] = deps_sha
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PY
  fi

  echo "env=$env_name"
  echo "current_dir=$current_dir"
  echo "legacy_root=$legacy_root"
  echo "manifest_root=$manifest_root"
  echo "dependency_sha=$deps_sha"
  echo "dependencies_dir=$deps_dir"
  echo "previous_node_modules_target=$current_node_modules_target"
  echo "current_node_modules_target=$(readlink -f "$current_dir/node_modules")"
}

case "__ENVIRONMENT__" in
  all)
    sync_env "staging" "/home/openclaw/tm-runtime/staging/current" "/home/openclaw/terraforming-mars-staging" "/home/openclaw/tm-runtime/staging/shared"
    echo "---"
    sync_env "prod" "/home/openclaw/tm-runtime/prod/current" "/home/openclaw/terraforming-mars" "/home/openclaw/tm-runtime/prod/shared"
    ;;
  staging)
    sync_env "staging" "/home/openclaw/tm-runtime/staging/current" "/home/openclaw/terraforming-mars-staging" "/home/openclaw/tm-runtime/staging/shared"
    ;;
  prod)
    sync_env "prod" "/home/openclaw/tm-runtime/prod/current" "/home/openclaw/terraforming-mars" "/home/openclaw/tm-runtime/prod/shared"
    ;;
esac
'@

$remoteScript = $remoteScript.Replace("__ENVIRONMENT__", $Environment)

Write-Host "Target VPS : $VpsHost"
Write-Host "Environment: $Environment"
Write-Host "Mode       : $(if ($DryRun) { 'dry-run' } else { 'apply without service restart' })"

if ($DryRun) {
    Write-Host ""
    Write-Host $remoteScript
    exit 0
}

 $tempScript = New-TemporaryFile
 $remoteScriptPath = "/tmp/tm-sync-runtime-deps-$PID.sh"

try {
    $remoteScriptLf = $remoteScript -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($tempScript.FullName, $remoteScriptLf, [System.Text.UTF8Encoding]::new($false))
    & scp.exe $tempScript.FullName "${VpsHost}:$remoteScriptPath"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upload dependency sync script."
    }

    Invoke-Ssh "chmod 700 '$remoteScriptPath' && bash '$remoteScriptPath' && rm -f '$remoteScriptPath'"
} finally {
    if (Test-Path $tempScript.FullName) {
        Remove-Item -LiteralPath $tempScript.FullName -Force
    }
}
