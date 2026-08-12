param(
    [string]$HostAlias = "hostkey-codex",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [string]$ExpectedGitSha,
    [string]$ExpectedArtifactSha,
    [string]$ExpectedReleaseBaselineBase64,
    [string[]]$IgnoredRealtimeGameId,
    [ValidateRange(1, 3600)]
    [int]$NextServiceHealthTimeoutSeconds = 180,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")
. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

Assert-TmReleaseCasBaselineBase64 -Token $ExpectedReleaseBaselineBase64
$ignoredRealtimeGameIds = @(Assert-TmIgnoredRealtimeGameIds -GameIds $IgnoredRealtimeGameId)

function Assert-OptionalSha {
    param(
        [string]$Name,
        [string]$Value,
        [int[]]$AllowedLengths
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return
    }

    if ($Value -notmatch '^[0-9a-fA-F]+$' -or $Value.Length -notin $AllowedLengths) {
        throw "$Name must be a hex sha with length $($AllowedLengths -join ' or ')."
    }
}

Assert-OptionalSha -Name "ExpectedGitSha" -Value $ExpectedGitSha -AllowedLengths @(40)
Assert-OptionalSha -Name "ExpectedArtifactSha" -Value $ExpectedArtifactSha -AllowedLengths @(64)

if (-not $DryRun) {
    if ([string]::IsNullOrWhiteSpace($ExpectedGitSha)) {
        throw "ExpectedGitSha is required for prod promotion. Read it from the tested staging release manifest."
    }
    if ([string]::IsNullOrWhiteSpace($ExpectedArtifactSha)) {
        throw "ExpectedArtifactSha is required for prod promotion. Read it from the tested staging release manifest."
    }
    if ([string]::IsNullOrWhiteSpace($ExpectedReleaseBaselineBase64)) {
        throw "ExpectedReleaseBaselineBase64 is required for prod promotion CAS protection."
    }
}

$expectedGitShaLower = if ([string]::IsNullOrWhiteSpace($ExpectedGitSha)) { "" } else { $ExpectedGitSha.ToLowerInvariant() }
$expectedArtifactShaLower = if ([string]::IsNullOrWhiteSpace($ExpectedArtifactSha)) { "" } else { $ExpectedArtifactSha.ToLowerInvariant() }
$ignoredRealtimeGameIdsCsv = $ignoredRealtimeGameIds -join ","
$promoteRunToken = New-TmReleaseRunToken

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
set -euo pipefail

staging_root="/home/openclaw/tm-runtime/staging"
staging_current="$staging_root/current"
prod_root="/home/openclaw/tm-runtime/prod"
runtime_root="$prod_root"
prod_current="$prod_root/current"
prod_next_root="/home/openclaw/tm-runtime/prod-next"
prod_next_current="$prod_next_root/current"
legacy_prod="/home/openclaw/terraforming-mars"
service="tm-server"
next_service="tm-server-next"
elo_service="tm-elo"
prod_port="8081"
next_port="8085"
health_url="http://127.0.0.1:$prod_port"
next_health_url="http://127.0.0.1:$next_port"
next_health_timeout_seconds="__NEXT_SERVICE_HEALTH_TIMEOUT_SECONDS__"
health_poll_delay_seconds=2
elo_health_url="http://127.0.0.1:8082/api/elo-submit"
release_url="${health_url%/}/release.json"
release_url_fallback="${health_url%/}/assets/release.json"
next_release_url="${next_health_url%/}/release.json"
next_release_url_fallback="${next_health_url%/}/assets/release.json"
upstream_snippet="/etc/nginx/snippets/tm-prod-active-upstream.conf"
required_git_sha="__EXPECTED_GIT_SHA__"
required_artifact_sha="__EXPECTED_ARTIFACT_SHA__"
expected_release_baseline_b64="__EXPECTED_RELEASE_BASELINE_B64__"
ignored_realtime_game_ids_csv="__IGNORED_REALTIME_GAME_IDS_CSV__"
run_token="__RUN_TOKEN__"
work_root="/tmp/tm-promote-${run_token}"
release_dir="$work_root/release"
shared_root="$prod_root/shared"
deps_root="$shared_root/deps"
releases_root="$prod_root/releases"
new_release_dir=""
previous_current=""
active_proxy_port="$prod_port"
elo_files="index.html audit_player_names.py elo-api.js elo_aliases.py excluded_games.json fix_elo_dupes.py import_gamedb_to_elo.py migrate_elo_nicknames.py player_name_aliases.json player_name_overrides.json tm-sync-elo.py"
deploy_lock_file="/home/openclaw/tm-runtime/.deploy.lock"
deploy_lock_info="/home/openclaw/tm-runtime/.deploy.lock.info"
game_db_path="$shared_root/db/game.db"
nginx_snippet_backup="$work_root/nginx-before.conf"
previous_current_link_target=""
previous_current_link_existed=0
scripts_dir="/home/openclaw/scripts"

normalize_release_permissions() {
  local candidate="$1"
  local resolved_releases
  local resolved_candidate
  local public_file

  resolved_releases="$(readlink -f -- "$releases_root")" || return 49
  resolved_candidate="$(readlink -f -- "$candidate")" || return 49
  if [ "$(dirname -- "$resolved_candidate")" != "$resolved_releases" ]; then
    echo "Release permission normalization rejected a candidate outside the releases root." >&2
    return 49
  fi
  for public_file in build assets elo; do
    if [ ! -d "$resolved_candidate/$public_file" ]; then
      echo "Release permission normalization found an incomplete candidate." >&2
      return 49
    fi
  done

  chmod 755 "$runtime_root" "$releases_root" "$shared_root" "$shared_root/elo" "$resolved_candidate" || return 49
  find "$resolved_candidate/build" "$resolved_candidate/assets" "$resolved_candidate/elo" -xdev -type d -exec chmod 755 {} + || return 49
  find "$resolved_candidate/build" "$resolved_candidate/assets" "$resolved_candidate/elo" -xdev -type f -exec chmod 644 {} + || return 49
  for public_file in package.json package-lock.json; do
    if [ -f "$resolved_candidate/$public_file" ]; then
      chmod 644 "$resolved_candidate/$public_file" || return 49
    fi
  done
  for public_file in elo-data.json data.json solo-records.json stats.json; do
    if [ -f "$shared_root/elo/$public_file" ]; then
      chmod 664 "$shared_root/elo/$public_file" || return 49
    fi
  done

  if find "$resolved_candidate/build" "$resolved_candidate/assets" "$resolved_candidate/elo" -xdev -type d ! -perm 0755 -print -quit | grep -q .; then
    return 49
  fi
  if find "$resolved_candidate/build" "$resolved_candidate/assets" "$resolved_candidate/elo" -xdev -type f ! -perm 0644 -print -quit | grep -q .; then
    return 49
  fi
  for public_file in "$resolved_candidate/assets/release.json" "$resolved_candidate/elo/data.json" "$resolved_candidate/elo/elo-data.json"; do
    if [ ! -f "$public_file" ] || [ $((8#$(stat -Lc '%a' -- "$public_file") & 6)) -ne 4 ]; then
      echo "Release permission normalization left a public endpoint unreadable or writable by others." >&2
      return 49
    fi
  done
}

wait_for_http() {
  local url="$1"
  local attempts="$2"
  local delay="$3"
  for attempt in $(seq 1 "$attempts"); do
    if curl -fsS -I "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

wait_for_elo() {
  local url="$1"
  local attempts="$2"
  local delay="$3"
  for attempt in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

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

assert_dependency_sha() {
  local expected_sha="$1"
  local package_lock_path="$2"
  local actual_sha

  if ! [[ "$expected_sha" =~ ^[0-9a-f]{64}$ ]]; then
    return 47
  fi
  if ! actual_sha="$(python3 - "$package_lock_path" <<'PY'
import hashlib
import pathlib
import sys

try:
    text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8-sig")
    normalized = text.replace("\r\n", "\n")
    print(hashlib.sha256(normalized.encode("utf-8")).hexdigest())
except Exception:
    raise SystemExit(47)
PY
  )"; then
    return 47
  fi
  if [ "$actual_sha" != "$expected_sha" ]; then
    return 47
  fi
  return 0
}

publish_elo_helpers() {
  local source_release="$1"
  local artifact_sha="$2"
  local git_sha="$3"

  python3 - "$source_release" "$scripts_dir" "$artifact_sha" "$git_sha" "$run_token" <<'PY'
import json
import os
import pathlib
import re
import sys


FILES = (
    ("tm-sync-elo.py", 0o755),
    ("elo_aliases.py", 0o755),
    ("player_name_aliases.json", 0o644),
    ("player_name_overrides.json", 0o644),
    ("excluded_games.json", 0o644),
)


def atomic_write(path, payload, mode, run_token):
    temporary = path.with_name(f".{path.name}.{run_token}.tmp")
    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode)
        with os.fdopen(descriptor, "wb") as output:
            output.write(payload)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def fsync_directory(path):
    try:
        directory_descriptor = os.open(path, os.O_RDONLY)
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
    except OSError:
        if os.name != "nt":
            raise


try:
    source_release = pathlib.Path(sys.argv[1])
    destination = pathlib.Path(sys.argv[2])
    artifact_sha = sys.argv[3]
    git_sha = sys.argv[4]
    run_token = sys.argv[5]
    if re.fullmatch(r"[0-9a-f]{64}", artifact_sha) is None:
        raise ValueError("invalid artifact sha")
    if re.fullmatch(r"[0-9a-f]{40}", git_sha) is None:
        raise ValueError("invalid git sha")
    if re.fullmatch(r"[0-9]{14}-[0-9]+-[0-9a-f]{32}", run_token) is None:
        raise ValueError("invalid run token")

    source_directory = source_release / "elo"
    payloads = []
    for filename, mode in FILES:
        source = source_directory / filename
        if not source.is_file():
            raise ValueError("missing helper source")
        payloads.append((filename, mode, source.read_bytes()))

    destination.mkdir(parents=True, exist_ok=True)
    completion_path = destination / ".tm-elo-helpers-release.json"
    try:
        completion_path.unlink()
    except FileNotFoundError:
        pass
    fsync_directory(destination)

    for filename, mode, payload in payloads:
        atomic_write(destination / filename, payload, mode, run_token)

    completion = {
        "schema": "TmEloHelperMirrorV1",
        "artifactSha256": artifact_sha,
        "gitSha": git_sha,
        "files": [filename for filename, _ in FILES],
    }
    payload = (json.dumps(completion, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    atomic_write(completion_path, payload, 0o644, run_token)
    fsync_directory(destination)
except Exception:
    print("ELO helper mirror publication failed closed.", file=sys.stderr)
    raise SystemExit(48)
PY
}

read_release_json() {
  local primary="$1"
  local fallback="$2"
  if curl -fsS "$primary"; then
    return 0
  fi
  curl -fsS "$fallback"
}

assert_no_realtime_games_sqlite() {
  local checkpoint="$1"
  local gate_output
  local gate_exit
  local running_count
  local realtime_count
  local realtime_ids
  local turn_based_count
  local ended_count
  local ignored_count
  local ignored_ids

  set +e
  gate_output="$({
    cd "$prod_current"
    node - "$game_db_path" "$ignored_realtime_game_ids_csv" <<'NODE'
'use strict';

const GAME_ID = /^[A-Za-z0-9_-]{1,128}$/;

function parseIgnoredIds(csv) {
  if (csv === '') return new Set();
  const ids = csv.split(',');
  if (ids.some((id) => !GAME_ID.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error('invalid ignored game id list');
  }
  return new Set(ids);
}

function classifyLatestRows(rows, ignoredIds) {
  if (!Array.isArray(rows)) throw new Error('latest-save query did not return rows');
  const result = {ended: [], turnBased: [], realtime: [], ignored: []};
  const seen = new Set();

  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('malformed latest row');
    const gameId = row.game_id;
    if (typeof gameId !== 'string' || !GAME_ID.test(gameId) || seen.has(gameId)) throw new Error('invalid latest game id');
    seen.add(gameId);
    if (typeof row.status !== 'string' || row.status.trim() !== 'running' || typeof row.game !== 'string') throw new Error('malformed running latest row');

    const game = JSON.parse(row.game);
    if (game === null || typeof game !== 'object' || Array.isArray(game) || game.id !== gameId) throw new Error('serialized game mismatch');
    if (typeof game.phase !== 'string') throw new Error('serialized game phase is missing');
    if (game.phase === 'end') {
      result.ended.push(gameId);
      continue;
    }
    const gameOptions = game.gameOptions === undefined || game.gameOptions === null ? {} : game.gameOptions;
    if (typeof gameOptions !== 'object' || Array.isArray(gameOptions)) {
      throw new Error('serialized game options are malformed');
    }

    let turnBased;
    if (Object.prototype.hasOwnProperty.call(gameOptions, 'turnBasedGame')) {
      if (typeof gameOptions.turnBasedGame !== 'boolean') throw new Error('turnBasedGame is not boolean');
      turnBased = gameOptions.turnBasedGame;
    } else {
      if (!Array.isArray(game.players)) throw new Error('legacy game players are malformed');
      turnBased = game.players.some((player) => {
        if (player === null || typeof player !== 'object' || Array.isArray(player)) throw new Error('legacy player is malformed');
        if (!Object.prototype.hasOwnProperty.call(player, 'telegramID')) return false;
        if (typeof player.telegramID !== 'string') throw new Error('legacy telegram id is malformed');
        return player.telegramID.trim() !== '';
      });
    }

    if (turnBased) {
      result.turnBased.push(gameId);
    } else if (ignoredIds.has(gameId)) {
      result.ignored.push(gameId);
    } else {
      result.realtime.push(gameId);
    }
  }

  for (const ids of Object.values(result)) ids.sort();
  return result;
}

function readLatestRunningRows(dbPath) {
  if (process.env.TM_RELEASE_LIVE_GATE_FIXTURE_JSON !== undefined) {
    return JSON.parse(process.env.TM_RELEASE_LIVE_GATE_FIXTURE_JSON);
  }
  const Database = require('better-sqlite3');
  const db = new Database(dbPath, {readonly: true, fileMustExist: true});
  try {
    db.pragma('query_only = ON');
    return db.prepare(`
      SELECT latest.game_id, latest.game, latest.status, latest.save_id
      FROM games AS latest
      INNER JOIN (
        SELECT game_id, MAX(save_id) AS max_save_id
        FROM games
        GROUP BY game_id
      ) AS latest_save
        ON latest.game_id = latest_save.game_id
       AND latest.save_id = latest_save.max_save_id
      WHERE trim(latest.status, char(9) || char(10) || char(11) || char(12) || char(13) || ' ') = 'running'
      ORDER BY latest.game_id
    `).all();
  } finally {
    db.close();
  }
}

try {
  const [dbPath, ignoredCsv = ''] = process.argv.slice(2);
  if (typeof dbPath !== 'string' || dbPath === '') throw new Error('database path is missing');
  const rows = readLatestRunningRows(dbPath);
  const result = classifyLatestRows(rows, parseIgnoredIds(ignoredCsv));
  console.log(`running_count=${rows.length}`);
  console.log(`turn_based_count=${result.turnBased.length}`);
  console.log(`ended_count=${result.ended.length}`);
  console.log(`ignored_count=${result.ignored.length}`);
  console.log(`ignored_ids=${result.ignored.join(',')}`);
  console.log(`realtime_count=${result.realtime.length}`);
  console.log(`realtime_ids=${result.realtime.join(',')}`);
} catch (_) {
  console.error('TM live-game SQLite gate failed closed.');
  process.exit(43);
}
NODE
  } 2>/dev/null)"
  gate_exit=$?
  set -e
  if [ "$gate_exit" -ne 0 ]; then
    echo "Prod promote blocked at $checkpoint: SQLite latest-save live-game gate failed closed." >&2
    return 43
  fi

  running_count="$(printf '%s\n' "$gate_output" | sed -n 's/^running_count=//p')"
  turn_based_count="$(printf '%s\n' "$gate_output" | sed -n 's/^turn_based_count=//p')"
  ended_count="$(printf '%s\n' "$gate_output" | sed -n 's/^ended_count=//p')"
  ignored_count="$(printf '%s\n' "$gate_output" | sed -n 's/^ignored_count=//p')"
  ignored_ids="$(printf '%s\n' "$gate_output" | sed -n 's/^ignored_ids=//p')"
  realtime_count="$(printf '%s\n' "$gate_output" | sed -n 's/^realtime_count=//p')"
  realtime_ids="$(printf '%s\n' "$gate_output" | sed -n 's/^realtime_ids=//p')"
  for count in "$running_count" "$turn_based_count" "$ended_count" "$ignored_count" "$realtime_count"; do
    case "$count" in
      ''|*[!0-9]*)
        echo "Prod promote blocked at $checkpoint: malformed SQLite gate summary." >&2
        return 43
        ;;
    esac
  done
  case "$ignored_ids,$realtime_ids" in
    *[!A-Za-z0-9_,-]*)
      echo "Prod promote blocked at $checkpoint: malformed SQLite gate identifiers." >&2
      return 43
      ;;
  esac

  echo "Prod SQLite live-game gate at $checkpoint: running=$running_count turn_based=$turn_based_count ended=$ended_count ignored=$ignored_count ignored_ids=${ignored_ids:-none} realtime=$realtime_count realtime_ids=${realtime_ids:-none}"
  if [ "$realtime_count" -gt 0 ]; then
    echo "Prod promote blocked at $checkpoint: active realtime games=$realtime_count ids=${realtime_ids:-unknown}." >&2
    return 42
  fi
}

read_proxy_port() {
  python3 - "$upstream_snippet" <<'PY'
import pathlib
import re
import sys

try:
    lines = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").splitlines()
    active = [line.strip() for line in lines if line.strip() and not line.lstrip().startswith("#")]
    if len(active) != 1:
        raise ValueError("expected exactly one active directive")
    match = re.fullmatch(r"set[ \t]+\$tm_prod_backend[ \t]+http://127\.0\.0\.1:([0-9]+);", active[0])
    if match is None:
        raise ValueError("active directive is not canonical")
    port = int(match.group(1))
    if port < 1 or port > 65535:
        raise ValueError("backend port is out of range")
    print(port)
except Exception:
    raise SystemExit(1)
PY
}

require_primary_proxy_backend() {
  local observed_port="$1"
  if [ "$observed_port" != "$prod_port" ]; then
    echo "Prod promote blocked: active proxy backend must be $prod_port before promotion; observed=${observed_port:-missing}." >&2
    return 44
  fi
}

set_proxy_port() {
  local port="$1"
  local tmp
  if ! tmp="$(mktemp)"; then
    return 1
  fi
  if ! printf 'set $tm_prod_backend http://127.0.0.1:%s;\n' "$port" > "$tmp"; then
    rm -f "$tmp"
    return 1
  fi
  if ! sudo install -m 644 "$tmp" "$upstream_snippet"; then
    rm -f "$tmp"
    return 1
  fi
  rm -f "$tmp"
  if ! sudo nginx -t >/dev/null; then
    return 1
  fi
  if ! sudo systemctl reload nginx; then
    return 1
  fi
  active_proxy_port="$port"
}

cleanup_new_release() {
  if [ -n "$new_release_dir" ] && [ -d "$new_release_dir" ] && [ "$new_release_dir" != "$previous_current" ]; then
    rm -rf "$new_release_dir"
  fi
}

cleanup_work_root() {
  if [ -e "$nginx_snippet_backup" ]; then
    sudo rm -f "$nginx_snippet_backup" || true
  fi
  rm -rf "$work_root"
}

backup_public_state() {
  if ! mkdir -p "$work_root"; then
    return 1
  fi
  if ! sudo rm -f "$nginx_snippet_backup"; then
    return 1
  fi
  if ! sudo cp -a -- "$upstream_snippet" "$nginx_snippet_backup"; then
    return 1
  fi
}

restore_public_state() {
  local restore_failed=0

  if [ "$previous_current_link_existed" = "1" ]; then
    if ! ln -sfn "$previous_current_link_target" "$prod_current"; then
      restore_failed=1
    fi
  elif ! rm -f "$prod_current"; then
    restore_failed=1
  fi

  if ! systemctl --user restart "$service"; then
    restore_failed=1
  elif ! wait_for_http "$health_url" 20 2; then
    restore_failed=1
  fi

  if [ ! -f "$nginx_snippet_backup" ]; then
    restore_failed=1
  elif ! sudo cp -a --remove-destination -- "$nginx_snippet_backup" "$upstream_snippet"; then
    restore_failed=1
  elif ! sudo nginx -t >/dev/null; then
    restore_failed=1
  elif ! sudo systemctl reload nginx; then
    restore_failed=1
  elif ! active_proxy_port="$(read_proxy_port)"; then
    restore_failed=1
  elif [ "$active_proxy_port" != "$prod_port" ]; then
    restore_failed=1
  else
    :
  fi

  if ! systemctl --user restart "$elo_service"; then
    restore_failed=1
  elif ! wait_for_elo "$elo_health_url" 10 2; then
    restore_failed=1
  fi

  return "$restore_failed"
}

rollback_before_public_switch() {
  systemctl --user stop "$next_service" || true
  rm -f "$prod_next_current"
  cleanup_new_release
  cleanup_work_root
}

rollback_after_public_switch() {
  echo "$1" >&2
  if restore_public_state; then
    systemctl --user stop "$next_service" || true
    rm -f "$prod_next_current"
    cleanup_new_release
    cleanup_work_root
  else
    echo "Automatic rollback was incomplete; next backend and rollback artifacts were retained." >&2
  fi
  exit 1
}

mkdir -p "$(dirname "$deploy_lock_file")"
exec 9>"$deploy_lock_file"
if ! flock -n 9; then
  echo "Another TM deploy or promote is already running." >&2
  if [ -f "$deploy_lock_info" ]; then
    cat "$deploy_lock_info" >&2 || true
  fi
  exit 75
fi
{
  echo "operation=promote"
  echo "source=$staging_current"
  echo "target=$prod_current"
  echo "required_git_sha=$required_git_sha"
  echo "required_artifact_sha=$required_artifact_sha"
  echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "pid=$$"
} > "$deploy_lock_info"
trap 'rm -f "$deploy_lock_info"' EXIT

set +e
assert_release_cas "$expected_release_baseline_b64" "/home/openclaw/tm-runtime"
cas_exit=$?
set -e
if [ "$cas_exit" -ne 0 ]; then
  exit 46
fi

initial_proxy_port="$(read_proxy_port || true)"
if require_primary_proxy_backend "$initial_proxy_port"; then
  active_proxy_port="$initial_proxy_port"
  current_proxy_port="$initial_proxy_port"
else
  proxy_exit=$?
  exit "$proxy_exit"
fi

if ! systemctl --user cat "$service" | grep -F "WorkingDirectory=$prod_current" >/dev/null; then
  echo "Service $service is not pointed at $prod_current. Run sync_tm_runtime_services.ps1 first." >&2
  exit 1
fi
if ! systemctl --user cat "$next_service" | grep -F "WorkingDirectory=$prod_next_current" >/dev/null; then
  echo "Service $next_service is not pointed at $prod_next_current. Run sync_tm_runtime_services.ps1 first." >&2
  exit 1
fi
if ! systemctl --user cat "$elo_service" | grep -F "$prod_current/elo/elo-api.js" >/dev/null; then
  echo "Service $elo_service is not pointed at $prod_current. Run sync_tm_runtime_services.ps1 first." >&2
  exit 1
fi
if ! sudo test -f "$upstream_snippet"; then
  echo "Missing nginx upstream snippet: $upstream_snippet. Run sync_tm_public_gateway.ps1 first." >&2
  exit 1
fi

mkdir -p "$prod_root" "$prod_next_root" "$releases_root" "$shared_root/db" "$shared_root/logs" "$shared_root/elo" "$deps_root"
if [ ! -f "$game_db_path" ]; then
  echo "Prod promote blocked: shared game.db is missing; migrate it separately with explicit approval before promotion." >&2
  exit 49
fi
if [ -d "$legacy_prod/logs" ] && [ -z "$(ls -A "$shared_root/logs" 2>/dev/null || true)" ]; then
  rsync -a "$legacy_prod/logs/" "$shared_root/logs/"
fi
for data_file in elo-data.json data.json solo-records.json stats.json; do
  if [ -f "$legacy_prod/elo/$data_file" ] && [ ! -e "$shared_root/elo/$data_file" ]; then
    cp "$legacy_prod/elo/$data_file" "$shared_root/elo/$data_file"
  fi
done
if [ ! -e "$shared_root/elo/stats.json" ]; then
  printf '{"generatedAt":null,"gameCount":0,"playerGameCount":0,"players":[],"generationRecords":[],"records":[],"cardStats":[]}\n' > "$shared_root/elo/stats.json"
fi

if [ -L "$prod_current" ]; then
  previous_current_link_existed=1
  previous_current_link_target="$(readlink "$prod_current")"
  previous_current="$(readlink -f "$prod_current" || true)"
elif [ -d "$legacy_prod" ]; then
  previous_current="$legacy_prod"
fi
if [ "$previous_current_link_existed" != "1" ] || [ -z "$previous_current_link_target" ] || [ -z "$previous_current" ]; then
  echo "Prod promote blocked: prod current must be an existing symlink for exact rollback." >&2
  exit 1
fi
test -f "$staging_current/build/main.js"
test -f "$staging_current/build/src/server/server.js"
test -f "$staging_current/assets/index.html"
test -f "$staging_current/assets/release.json"
test -f "$staging_current/elo/index.html"
test -f "$staging_current/elo/elo-api.js"
test -f "$staging_current/package.json"
test -f "$staging_current/package-lock.json"

expected_artifact_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("artifactSha256", ""))' "$staging_current/assets/release.json")"
expected_git_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("gitSha", ""))' "$staging_current/assets/release.json")"
expected_dependency_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("dependencySha256", ""))' "$staging_current/assets/release.json")"
expected_environment="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("environment", ""))' "$staging_current/assets/release.json")"
expected_source_tree_clean="$(python3 -c 'import json, sys; value=json.load(open(sys.argv[1])).get("sourceTreeClean"); print("true" if type(value) is bool and value else "false" if type(value) is bool else "invalid")' "$staging_current/assets/release.json")"
test -n "$expected_artifact_sha"
if ! assert_dependency_sha "$expected_dependency_sha" "$staging_current/package-lock.json"; then
  echo "Staging dependencySha256 is malformed or does not match the normalized package lock." >&2
  exit 47
fi
if [ "$expected_environment" != "staging" ]; then
  echo "Staging release manifest has unexpected environment: ${expected_environment:-missing}" >&2
  exit 1
fi
if [ "$expected_source_tree_clean" != "true" ]; then
  echo "Staging release manifest is not from a clean source tree." >&2
  exit 1
fi
if [ -n "$required_artifact_sha" ] && [ "$expected_artifact_sha" != "$required_artifact_sha" ]; then
  echo "Staging artifact changed before promote: expected $required_artifact_sha, got $expected_artifact_sha" >&2
  exit 1
fi
if [ -n "$required_git_sha" ] && [ "$expected_git_sha" != "$required_git_sha" ]; then
  echo "Staging git sha changed before promote: expected $required_git_sha, got $expected_git_sha" >&2
  exit 1
fi

current_prod_release_json=""
current_prod_artifact_sha=""
current_prod_git_sha=""
if current_prod_release_json="$(read_release_json "$release_url" "$release_url_fallback" 2>/dev/null)"; then
  if ! current_prod_artifact_sha="$(printf '%s' "$current_prod_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("artifactSha256", ""))')"; then
    current_prod_artifact_sha=""
  fi
  if ! current_prod_git_sha="$(printf '%s' "$current_prod_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("gitSha", ""))')"; then
    current_prod_git_sha=""
  fi
fi

if [ -n "$expected_artifact_sha" ] && [ -n "$expected_git_sha" ] && \
   [ "$current_prod_artifact_sha" = "$expected_artifact_sha" ] && \
   [ "$current_prod_git_sha" = "$expected_git_sha" ] && \
   [ "$current_proxy_port" = "$prod_port" ]; then
  if ! publish_elo_helpers "$staging_current" "$expected_artifact_sha" "$expected_git_sha"; then
    echo "Promote no-op could not reconcile the ELO helper mirror." >&2
    exit 48
  fi
  echo "Promote no-op"
  echo "reason=prod already serves the exact tested staging artifact"
  echo "artifact_sha=$current_prod_artifact_sha"
  echo "git_sha=$current_prod_git_sha"
  exit 0
fi

if assert_no_realtime_games_sqlite "preflight"; then
  :
else
  gate_exit=$?
  exit "$gate_exit"
fi

deps_dir="$deps_root/$expected_dependency_sha"
if [ ! -d "$deps_dir/node_modules" ]; then
  deps_tmp="$deps_root/.tmp-$expected_dependency_sha-$$"
  rm -rf "$deps_tmp"
  mkdir -p "$deps_tmp"
  cp "$staging_current/package.json" "$deps_tmp/package.json"
  cp "$staging_current/package-lock.json" "$deps_tmp/package-lock.json"
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

mkdir -p "$release_dir"
rsync -a --delete "$staging_current/build/" "$release_dir/build/"
rsync -a --delete "$staging_current/assets/" "$release_dir/assets/"
cp "$staging_current/package.json" "$release_dir/package.json"
cp "$staging_current/package-lock.json" "$release_dir/package-lock.json"
mkdir -p "$release_dir/elo"
for file in $elo_files; do
  cp "$staging_current/elo/$file" "$release_dir/elo/$file"
done

ts="$(date +%Y%m%d%H%M%S)"
release_name="${ts}-${expected_git_sha}-${run_token}"
new_release_dir="$releases_root/$release_name"
rm -rf "$new_release_dir"
mkdir -p "$new_release_dir"
mv "$release_dir/build" "$new_release_dir/build"
mv "$release_dir/assets" "$new_release_dir/assets"
mv "$release_dir/package.json" "$new_release_dir/package.json"
mv "$release_dir/package-lock.json" "$new_release_dir/package-lock.json"
python3 - "$new_release_dir/assets/release.json" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
manifest = json.loads(path.read_text(encoding="utf-8-sig"))
manifest["environment"] = "prod"
path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
PY
mkdir -p "$new_release_dir/elo"
for file in $elo_files; do
  cp "$release_dir/elo/$file" "$new_release_dir/elo/$file"
done
ln -sfn "$shared_root/db" "$new_release_dir/db"
ln -sfn "$shared_root/logs" "$new_release_dir/logs"
ln -sfn "$shared_root/elo/elo-data.json" "$new_release_dir/elo/elo-data.json"
ln -sfn "$shared_root/elo/data.json" "$new_release_dir/elo/data.json"
ln -sfn "$shared_root/elo/solo-records.json" "$new_release_dir/elo/solo-records.json"
ln -sfn "$shared_root/elo/stats.json" "$new_release_dir/elo/stats.json"
ln -sfn "$deps_dir/node_modules" "$new_release_dir/node_modules"

if ! normalize_release_permissions "$new_release_dir"; then
  echo "Release permission normalization failed." >&2
  rollback_before_public_switch
  exit 49
fi

ln -sfn "$new_release_dir" "$prod_next_current"
if ! systemctl --user restart "$next_service"; then
  echo "Next service restart failed." >&2
  rollback_before_public_switch
  exit 1
fi
next_health_attempts=$(( (next_health_timeout_seconds + health_poll_delay_seconds - 1) / health_poll_delay_seconds ))
if ! wait_for_http "$next_health_url" "$next_health_attempts" "$health_poll_delay_seconds"; then
  echo "Next service health check failed." >&2
  rollback_before_public_switch
  exit 1
fi

next_release_json="$(read_release_json "$next_release_url" "$next_release_url_fallback")"
next_artifact_sha="$(printf '%s' "$next_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("artifactSha256", ""))')"
next_git_sha="$(printf '%s' "$next_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("gitSha", ""))')"
if [ "$next_artifact_sha" != "$expected_artifact_sha" ] || { [ -n "$expected_git_sha" ] && [ "$next_git_sha" != "$expected_git_sha" ]; }; then
  echo "Next service manifest mismatch." >&2
  rollback_before_public_switch
  exit 1
fi

if ! backup_public_state; then
  echo "Could not back up the exact nginx public routing state." >&2
  rollback_before_public_switch
  exit 1
fi

if assert_no_realtime_games_sqlite "before-public-switch"; then
  :
else
  gate_exit=$?
  rollback_before_public_switch
  exit "$gate_exit"
fi

if ! ln -sfn "$new_release_dir" "$prod_current"; then
  rollback_after_public_switch "Could not switch prod current to the candidate release."
fi
if ! set_proxy_port "$next_port"; then
  rollback_after_public_switch "Could not switch public traffic to the next backend."
fi

if ! systemctl --user restart "$elo_service"; then
  rollback_after_public_switch "ELO restart failed after switching public traffic to next."
fi
if ! wait_for_elo "$elo_health_url" 10 2; then
  rollback_after_public_switch "ELO health check failed after switching public traffic to next."
fi

if ! systemctl --user restart "$service"; then
  rollback_after_public_switch "Primary prod service restart failed after switching public traffic to next."
fi
if ! wait_for_http "$health_url" 20 2; then
  rollback_after_public_switch "Primary prod service health check failed after switching public traffic to next."
fi

if ! served_release_json="$(read_release_json "$release_url" "$release_url_fallback")"; then
  rollback_after_public_switch "Could not read the primary prod release manifest after restart."
fi
if ! served_artifact_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("artifactSha256", ""))')"; then
  rollback_after_public_switch "Primary prod release manifest is malformed after restart."
fi
if ! served_git_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("gitSha", ""))')"; then
  rollback_after_public_switch "Primary prod release manifest is malformed after restart."
fi
if [ -z "$served_artifact_sha" ] || [ "$served_artifact_sha" != "$expected_artifact_sha" ]; then
  rollback_after_public_switch "Primary prod service manifest hash mismatch after restart."
fi
if [ -n "$expected_git_sha" ] && [ "$served_git_sha" != "$expected_git_sha" ]; then
  rollback_after_public_switch "Primary prod service git sha mismatch after restart."
fi

if ! set_proxy_port "$prod_port"; then
  rollback_after_public_switch "Could not switch public traffic back to the primary backend."
fi
systemctl --user stop "$next_service" || true
rm -f "$prod_next_current"

# Publish fixed-path cron/helper mirrors atomically after the public release transaction.
# If this fails, a retry reaches the exact-prod no-op above and reconciles the full set.
if ! publish_elo_helpers "$new_release_dir" "$served_artifact_sha" "$served_git_sha"; then
  echo "Prod is serving the new release, but ELO helper mirror reconciliation failed; retry the same promotion." >&2
  exit 48
fi

echo "Promote ok"
echo "source=$staging_current"
echo "runtime_root=$prod_root"
echo "current_link=$prod_current"
echo "next_current_link=$prod_next_current"
echo "legacy_root=$legacy_prod"
echo "release_dir=$new_release_dir"
echo "previous_current=$previous_current"
echo "service=$service"
echo "next_service=$next_service"
echo "elo_service=$elo_service"
echo "active_proxy_port=$active_proxy_port"
echo "health_url=$health_url"
echo "next_health_url=$next_health_url"
echo "elo_health_url=$elo_health_url"
echo "release_url=$release_url"
echo "artifact_sha=$served_artifact_sha"
echo "git_sha=$served_git_sha"
echo "dependency_sha=$expected_dependency_sha"
echo "dependencies_dir=$deps_dir"

cleanup_work_root
'@

Write-Host "Promoting tested staging build to prod on $HostAlias"
Write-Host "Source : /home/openclaw/tm-runtime/staging/current"
Write-Host "Target : /home/openclaw/tm-runtime/prod/current"
Write-Host "Health : http://127.0.0.1:8081"
if (-not [string]::IsNullOrWhiteSpace($expectedArtifactShaLower) -or -not [string]::IsNullOrWhiteSpace($expectedGitShaLower)) {
    Write-Host "Expect : artifact=$expectedArtifactShaLower git=$expectedGitShaLower"
}

$remoteScript = $remoteScript.Replace("__EXPECTED_GIT_SHA__", $expectedGitShaLower)
$remoteScript = $remoteScript.Replace("__EXPECTED_ARTIFACT_SHA__", $expectedArtifactShaLower)
$remoteScript = $remoteScript.Replace("__EXPECTED_RELEASE_BASELINE_B64__", $ExpectedReleaseBaselineBase64)
$remoteScript = $remoteScript.Replace("__IGNORED_REALTIME_GAME_IDS_CSV__", $ignoredRealtimeGameIdsCsv)
$remoteScript = $remoteScript.Replace("__NEXT_SERVICE_HEALTH_TIMEOUT_SECONDS__", $NextServiceHealthTimeoutSeconds.ToString([Globalization.CultureInfo]::InvariantCulture))
$remoteScript = $remoteScript.Replace("__RUN_TOKEN__", $promoteRunToken)

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Remote script:"
    Write-Host $remoteScript
    exit 0
}

$remoteScriptLf = $remoteScript -replace "`r`n", "`n"
Invoke-RemoteCommand -Command "bash -s" -InputText $remoteScriptLf
