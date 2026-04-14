param(
    [string]$HostAlias = "vps",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$remoteScript = @'
set -euo pipefail

staging="/home/openclaw/terraforming-mars-staging"
staging_root="/home/openclaw/tm-runtime/staging"
staging_current="$staging_root/current"
prod_root="/home/openclaw/tm-runtime/prod"
prod_current="$prod_root/current"
legacy_prod="/home/openclaw/terraforming-mars"
service="tm-server"
elo_service="tm-elo"
health_url="http://127.0.0.1:8081"
elo_health_url="http://127.0.0.1:8082/api/elo-submit"
release_url="${health_url%/}/release.json"
release_url_fallback="${health_url%/}/assets/release.json"
work_root="/tmp/tm-promote-$(date +%Y%m%d%H%M%S)"
release_dir="$work_root/release"
shared_root="$prod_root/shared"
releases_root="$prod_root/releases"
new_release_dir=""
previous_current="$legacy_prod"
elo_files="index.html elo-api.js elo_aliases.py fix_elo_dupes.py import_gamedb_to_elo.py player_name_aliases.json"

rollback() {
  if [ -n "$previous_current" ]; then
    ln -sfn "$previous_current" "$prod_current"
  else
    rm -f "$prod_current"
  fi
  if [ -n "$new_release_dir" ] && [ -d "$new_release_dir" ] && [ "$new_release_dir" != "$previous_current" ]; then
    rm -rf "$new_release_dir"
  fi
  systemctl --user restart "$service" || true
  systemctl --user restart "$elo_service" || true
}

if ! systemctl --user cat "$service" | grep -F "WorkingDirectory=$prod_current" >/dev/null; then
  echo "Service $service is not pointed at $prod_current. Run sync_tm_runtime_services.ps1 first." >&2
  exit 1
fi
if ! systemctl --user cat "$elo_service" | grep -F "$prod_current/elo/elo-api.js" >/dev/null; then
  echo "Service $elo_service is not pointed at $prod_current. Run sync_tm_runtime_services.ps1 first." >&2
  exit 1
fi

mkdir -p "$prod_root" "$releases_root" "$shared_root/db" "$shared_root/logs" "$shared_root/elo"
if [ ! -d "$legacy_prod/node_modules" ]; then
  echo "Missing runtime dependencies in $legacy_prod/node_modules" >&2
  exit 1
fi
if [ -d "$legacy_prod/db" ] && [ ! -e "$shared_root/db/game.db" ]; then
  rsync -a "$legacy_prod/db/" "$shared_root/db/"
fi
if [ -d "$legacy_prod/logs" ] && [ -z "$(ls -A "$shared_root/logs" 2>/dev/null || true)" ]; then
  rsync -a "$legacy_prod/logs/" "$shared_root/logs/"
fi
for data_file in elo-data.json data.json; do
  if [ -f "$legacy_prod/elo/$data_file" ] && [ ! -e "$shared_root/elo/$data_file" ]; then
    cp "$legacy_prod/elo/$data_file" "$shared_root/elo/$data_file"
  fi
done

if [ -L "$prod_current" ]; then
  previous_current="$(readlink -f "$prod_current" || true)"
fi

test -f "$staging_current/build/main.js"
test -f "$staging_current/build/src/server/server.js"
test -f "$staging_current/assets/index.html"
test -f "$staging_current/assets/release.json"
test -f "$staging_current/elo/index.html"
test -f "$staging_current/elo/elo-api.js"

expected_artifact_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("artifactSha256", ""))' "$staging_current/assets/release.json")"
expected_git_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("gitSha", ""))' "$staging_current/assets/release.json")"
test -n "$expected_artifact_sha"

mkdir -p "$release_dir"
rsync -a --delete "$staging_current/build/" "$release_dir/build/"
rsync -a --delete "$staging_current/assets/" "$release_dir/assets/"
mkdir -p "$release_dir/elo"
for file in $elo_files; do
  cp "$staging_current/elo/$file" "$release_dir/elo/$file"
done

ts="$(date +%Y%m%d%H%M%S)"
release_name="${ts}-${expected_git_sha}"
new_release_dir="$releases_root/$release_name"
rm -rf "$new_release_dir"
mkdir -p "$new_release_dir"
mv "$release_dir/build" "$new_release_dir/build"
mv "$release_dir/assets" "$new_release_dir/assets"
mkdir -p "$new_release_dir/elo"
for file in $elo_files; do
  cp "$release_dir/elo/$file" "$new_release_dir/elo/$file"
done
ln -sfn "$shared_root/db" "$new_release_dir/db"
ln -sfn "$shared_root/logs" "$new_release_dir/logs"
ln -sfn "$shared_root/elo/elo-data.json" "$new_release_dir/elo/elo-data.json"
ln -sfn "$shared_root/elo/data.json" "$new_release_dir/elo/data.json"
ln -sfn "$legacy_prod/node_modules" "$new_release_dir/node_modules"
ln -sfn "$new_release_dir" "$prod_current"

if ! systemctl --user restart "$service"; then
  echo "Restart failed, rolling back." >&2
  rollback
  exit 1
fi

if ! systemctl --user restart "$elo_service"; then
  echo "ELO restart failed, rolling back." >&2
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
  echo "Promoted artifact hash mismatch, rolling back." >&2
  echo "expected=$expected_artifact_sha actual=$served_artifact_sha" >&2
  rollback
  exit 1
fi

if [ -n "$expected_git_sha" ] && [ "$served_git_sha" != "$expected_git_sha" ]; then
  echo "Promoted git sha mismatch, rolling back." >&2
  echo "expected=$expected_git_sha actual=$served_git_sha" >&2
  rollback
  exit 1
fi

echo "Promote ok"
echo "source=$staging_current"
echo "runtime_root=$prod_root"
echo "current_link=$prod_current"
echo "legacy_root=$legacy_prod"
echo "release_dir=$new_release_dir"
echo "previous_current=$previous_current"
echo "service=$service"
echo "elo_service=$elo_service"
echo "health_url=$health_url"
echo "elo_health_url=$elo_health_url"
echo "release_url=$release_url"
echo "artifact_sha=$served_artifact_sha"
echo "git_sha=$served_git_sha"

rm -rf "$work_root"
'@

Write-Host "Promoting tested staging build to prod on $HostAlias"
Write-Host "Source : /home/openclaw/tm-runtime/staging/current"
Write-Host "Target : /home/openclaw/tm-runtime/prod/current"
Write-Host "Health : http://127.0.0.1:8081"

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Remote script:"
    Write-Host $remoteScript
    exit 0
}

$remoteScriptLf = $remoteScript -replace "`r`n", "`n"
$remoteScriptLf | & ssh.exe $HostAlias "bash -s"
if ($LASTEXITCODE -ne 0) {
    throw "Promote from staging to prod failed."
}
