param(
    [string]$HostAlias = "hostkey-codex",
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$ExpectedGitSha,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{64}$')]
    [string]$ExpectedArtifactSha,
    [ValidateRange(30, 900)]
    [int]$ValidationTimeoutSeconds = 120,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")
. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

$remoteScript = @'
set -euo pipefail

staging_current="/home/openclaw/tm-runtime/staging/current"
game_db="/home/openclaw/tm-runtime/prod/shared/db/game.db"
deploy_lock_file="/home/openclaw/tm-runtime/.deploy.lock"
deploy_lock_info="/home/openclaw/tm-runtime/.deploy.lock.info"
expected_git_sha="__EXPECTED_GIT_SHA__"
expected_artifact_sha="__EXPECTED_ARTIFACT_SHA__"
validation_timeout_seconds="__VALIDATION_TIMEOUT_SECONDS__"

cleanup() {
  local status=$?
  trap - EXIT
  rm -f "$deploy_lock_info"
  exit "$status"
}

mkdir -p "$(dirname "$deploy_lock_file")"
exec 9>"$deploy_lock_file"
if ! flock -n 9; then
  echo "Another TM deploy or promote is already running." >&2
  exit 75
fi
{
  echo "operation=prod-readonly-validation"
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

(
  cd "$staging_current"
  timeout --signal=TERM --kill-after=5 "${validation_timeout_seconds}s" \
    node build/src/server/tools/validate_saved_games.js "$game_db"
)
echo "Production saves validated read-only: git=$observed_git_sha artifact=$observed_artifact_sha"

'@

$remoteScript = $remoteScript.Replace("__EXPECTED_GIT_SHA__", $ExpectedGitSha.ToLowerInvariant())
$remoteScript = $remoteScript.Replace("__EXPECTED_ARTIFACT_SHA__", $ExpectedArtifactSha.ToLowerInvariant())
$remoteScript = $remoteScript.Replace("__VALIDATION_TIMEOUT_SECONDS__", $ValidationTimeoutSeconds.ToString([Globalization.CultureInfo]::InvariantCulture))

if ($DryRun) {
    Write-Host "Dry run only. Read-only validation script:"
    Write-Host $remoteScript
    exit 0
}

Invoke-TmSshScript -HostAlias $HostAlias -ScriptText ($remoteScript -replace "`r`n", "`n")
