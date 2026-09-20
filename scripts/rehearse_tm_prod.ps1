param(
    [string]$HostAlias = "hostkey-codex",
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$ExpectedGitSha,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{64}$')]
    [string]$ExpectedArtifactSha,
    [ValidateRange(120, 1800)]
    [int]$SqliteCopyTimeoutSeconds = 600,
    [ValidateRange(30, 900)]
    [int]$StaticCopyTimeoutSeconds = 120,
    [ValidateRange(120, 3600)]
    [int]$MaintenanceWindowSeconds = 600,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")
. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

$runToken = New-TmReleaseRunToken
$remoteScript = @'
set -euo pipefail

staging_current="/home/openclaw/tm-runtime/staging/current"
game_db="/home/openclaw/tm-runtime/prod/shared/db/game.db"
deploy_lock_file="/home/openclaw/tm-runtime/.deploy.lock"
deploy_lock_info="/home/openclaw/tm-runtime/.deploy.lock.info"
expected_git_sha="__EXPECTED_GIT_SHA__"
expected_artifact_sha="__EXPECTED_ARTIFACT_SHA__"
copy_timeout_seconds="__COPY_TIMEOUT_SECONDS__"
static_copy_timeout_seconds="__STATIC_COPY_TIMEOUT_SECONDS__"
maintenance_window_seconds="__MAINTENANCE_WINDOW_SECONDS__"
run_token="__RUN_TOKEN__"
work_root="/tmp/tm-prod-rehearsal-${run_token}"
rehearsal_db="$work_root/game.db"
restore_probe="$work_root/restore-probe.db"

cleanup() {
  local status=$?
  trap - EXIT
  rm -rf "$work_root"
  rm -f "$deploy_lock_info"
  exit "$status"
}

create_verified_copy() {
  local source_path="$1"
  local destination_path="$2"
  timeout --signal=TERM --kill-after=5 "${copy_timeout_seconds}s" python3 - "$source_path" "$destination_path" <<'PY'
import os
import pathlib
import sqlite3
import sys

source = pathlib.Path(sys.argv[1])
destination = pathlib.Path(sys.argv[2])
temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
if not source.is_file():
    raise SystemExit(51)
destination.parent.mkdir(parents=True, exist_ok=True)
for path in (temporary, destination):
    try:
        path.unlink()
    except FileNotFoundError:
        pass
try:
    source_db = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
    destination_db = sqlite3.connect(temporary)
    try:
        source_db.backup(destination_db)
        if [row[0] for row in destination_db.execute("PRAGMA integrity_check")] != ["ok"]:
            raise RuntimeError("integrity check failed")
    finally:
        destination_db.close()
        source_db.close()
    os.replace(temporary, destination)
except Exception:
    try:
        temporary.unlink()
    except FileNotFoundError:
        pass
    raise SystemExit(51)
PY
}

create_static_copy() {
  local source_path="$1"
  local destination_path="$2"
  local source_size
  local destination_size
  rm -f "$destination_path"
  timeout --signal=TERM --kill-after=5 "${static_copy_timeout_seconds}s" cp --sparse=auto -- "$source_path" "$destination_path"
  python3 - "$destination_path" <<'PY'
import os
import sys

with open(sys.argv[1], "r+b") as database_file:
    os.fsync(database_file.fileno())
PY
  source_size="$(stat -c %s "$source_path")"
  destination_size="$(stat -c %s "$destination_path")"
  [ -n "$source_size" ] && [ "$source_size" -gt 0 ] && [ "$source_size" = "$destination_size" ]
}

mkdir -p "$(dirname "$deploy_lock_file")"
exec 9>"$deploy_lock_file"
if ! flock -n 9; then
  echo "Another TM deploy or promote is already running." >&2
  exit 75
fi
{
  echo "operation=prod-rehearsal"
  echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "pid=$$"
} > "$deploy_lock_info"
trap cleanup EXIT

test -f "$game_db"
test -f "$staging_current/build/src/server/tools/validate_saved_games.js"
test -f "$staging_current/assets/release.json"
observed_git_sha="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("gitSha", ""))' "$staging_current/assets/release.json")"
observed_artifact_sha="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("artifactSha256", ""))' "$staging_current/assets/release.json")"
if [ "$observed_git_sha" != "$expected_git_sha" ] || [ "$observed_artifact_sha" != "$expected_artifact_sha" ]; then
  echo "Staging changed before prod rehearsal." >&2
  exit 46
fi

mkdir -p "$work_root"
first_started_ms="$(date +%s%3N)"
create_verified_copy "$game_db" "$rehearsal_db"
first_finished_ms="$(date +%s%3N)"
before_sha="$(sha256sum "$rehearsal_db" | awk '{print $1}')"
(
  cd "$staging_current"
  node build/src/server/tools/validate_saved_games.js "$rehearsal_db"
)
after_sha="$(sha256sum "$rehearsal_db" | awk '{print $1}')"
if [ -z "$before_sha" ] || [ "$before_sha" != "$after_sha" ]; then
  echo "Candidate validation modified the rehearsal database." >&2
  exit 52
fi

second_started_ms="$(date +%s%3N)"
create_static_copy "$rehearsal_db" "$restore_probe"
restore_sha="$(sha256sum "$restore_probe" | awk '{print $1}')"
second_finished_ms="$(date +%s%3N)"
if [ "$before_sha" != "$restore_sha" ]; then
  echo "Restore probe differs from its verified source." >&2
  exit 52
fi

first_ms=$((first_finished_ms - first_started_ms))
second_ms=$((second_finished_ms - second_started_ms))
estimated_ms=$((second_ms * 2 + 60000))
required_with_margin_ms=$((estimated_ms * 2))
budget_ms=$((maintenance_window_seconds * 1000))
echo "Prod rehearsal: online_snapshot_ms=$first_ms static_copy_ms=$second_ms estimated_backup_and_rollback_plus_startup_ms=$estimated_ms required_with_2x_margin_ms=$required_with_margin_ms budget_ms=$budget_ms"
if [ "$required_with_margin_ms" -gt "$budget_ms" ]; then
  echo "Production maintenance budget is insufficient for the measured rehearsal with 2x margin." >&2
  exit 54
fi
echo "Prod rehearsal OK: git=$observed_git_sha artifact=$observed_artifact_sha"
'@

$remoteScript = $remoteScript.Replace("__EXPECTED_GIT_SHA__", $ExpectedGitSha.ToLowerInvariant())
$remoteScript = $remoteScript.Replace("__EXPECTED_ARTIFACT_SHA__", $ExpectedArtifactSha.ToLowerInvariant())
$remoteScript = $remoteScript.Replace("__COPY_TIMEOUT_SECONDS__", $SqliteCopyTimeoutSeconds.ToString([Globalization.CultureInfo]::InvariantCulture))
$remoteScript = $remoteScript.Replace("__STATIC_COPY_TIMEOUT_SECONDS__", $StaticCopyTimeoutSeconds.ToString([Globalization.CultureInfo]::InvariantCulture))
$remoteScript = $remoteScript.Replace("__MAINTENANCE_WINDOW_SECONDS__", $MaintenanceWindowSeconds.ToString([Globalization.CultureInfo]::InvariantCulture))
$remoteScript = $remoteScript.Replace("__RUN_TOKEN__", $runToken)

if ($DryRun) {
    Write-Host "Dry run only. Remote rehearsal script:"
    Write-Host $remoteScript
    exit 0
}

Invoke-TmSshScript -HostAlias $HostAlias -ScriptText ($remoteScript -replace "`r`n", "`n")
