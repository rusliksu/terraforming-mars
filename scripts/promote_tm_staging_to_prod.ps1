param(
    [string]$HostAlias = "vps",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

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
elo_health_url="http://127.0.0.1:8082/api/elo-submit"
release_url="${health_url%/}/release.json"
release_url_fallback="${health_url%/}/assets/release.json"
next_release_url="${next_health_url%/}/release.json"
next_release_url_fallback="${next_health_url%/}/assets/release.json"
upstream_snippet="/etc/nginx/snippets/tm-prod-active-upstream.conf"
work_root="/tmp/tm-promote-$(date +%Y%m%d%H%M%S)"
release_dir="$work_root/release"
shared_root="$prod_root/shared"
deps_root="$shared_root/deps"
releases_root="$prod_root/releases"
new_release_dir=""
previous_current=""
active_proxy_port="$prod_port"
elo_files="index.html elo-api.js elo_aliases.py fix_elo_dupes.py import_gamedb_to_elo.py migrate_elo_nicknames.py player_name_aliases.json"

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

read_release_json() {
  local primary="$1"
  local fallback="$2"
  if curl -fsS "$primary"; then
    return 0
  fi
  curl -fsS "$fallback"
}

read_proxy_port() {
  if [ -f "$upstream_snippet" ]; then
    sed -n 's/.*127\.0\.0\.1:\([0-9][0-9]*\).*/\1/p' "$upstream_snippet" | head -n 1
  fi
}

set_proxy_port() {
  local port="$1"
  local tmp
  tmp="$(mktemp)"
  printf 'set $tm_prod_backend http://127.0.0.1:%s;\n' "$port" > "$tmp"
  sudo install -m 644 "$tmp" "$upstream_snippet"
  rm -f "$tmp"
  sudo nginx -t >/dev/null
  sudo systemctl reload nginx
  active_proxy_port="$port"
}

cleanup_new_release() {
  if [ -n "$new_release_dir" ] && [ -d "$new_release_dir" ] && [ "$new_release_dir" != "$previous_current" ]; then
    rm -rf "$new_release_dir"
  fi
}

rollback_before_public_switch() {
  systemctl --user stop "$next_service" || true
  rm -f "$prod_next_current"
  cleanup_new_release
  rm -rf "$work_root"
}

rollback_after_public_switch() {
  echo "$1" >&2
  if [ -n "$previous_current" ]; then
    ln -sfn "$previous_current" "$prod_current"
  fi
  if systemctl --user restart "$service"; then
    wait_for_http "$health_url" 20 2 || true
    set_proxy_port "$prod_port" || true
  fi
  systemctl --user restart "$elo_service" || true
  wait_for_elo "$elo_health_url" 10 2 || true
  systemctl --user stop "$next_service" || true
  rm -f "$prod_next_current"
  cleanup_new_release
  rm -rf "$work_root"
  exit 1
}

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
elif [ -d "$legacy_prod" ]; then
  previous_current="$legacy_prod"
fi
current_proxy_port="$(read_proxy_port || true)"
if [ -n "$current_proxy_port" ]; then
  active_proxy_port="$current_proxy_port"
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
test -n "$expected_artifact_sha"
test -n "$expected_dependency_sha"

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
release_name="${ts}-${expected_git_sha}"
new_release_dir="$releases_root/$release_name"
rm -rf "$new_release_dir"
mkdir -p "$new_release_dir"
mv "$release_dir/build" "$new_release_dir/build"
mv "$release_dir/assets" "$new_release_dir/assets"
mv "$release_dir/package.json" "$new_release_dir/package.json"
mv "$release_dir/package-lock.json" "$new_release_dir/package-lock.json"
mkdir -p "$new_release_dir/elo"
for file in $elo_files; do
  cp "$release_dir/elo/$file" "$new_release_dir/elo/$file"
done
ln -sfn "$shared_root/db" "$new_release_dir/db"
ln -sfn "$shared_root/logs" "$new_release_dir/logs"
ln -sfn "$shared_root/elo/elo-data.json" "$new_release_dir/elo/elo-data.json"
ln -sfn "$shared_root/elo/data.json" "$new_release_dir/elo/data.json"
ln -sfn "$deps_dir/node_modules" "$new_release_dir/node_modules"

ln -sfn "$new_release_dir" "$prod_next_current"
if ! systemctl --user restart "$next_service"; then
  echo "Next service restart failed." >&2
  rollback_before_public_switch
  exit 1
fi
if ! wait_for_http "$next_health_url" 20 2; then
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

ln -sfn "$new_release_dir" "$prod_current"
set_proxy_port "$next_port"

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

served_release_json="$(read_release_json "$release_url" "$release_url_fallback")"
served_artifact_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("artifactSha256", ""))')"
served_git_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("gitSha", ""))')"
if [ -z "$served_artifact_sha" ] || [ "$served_artifact_sha" != "$expected_artifact_sha" ]; then
  rollback_after_public_switch "Primary prod service manifest hash mismatch after restart."
fi
if [ -n "$expected_git_sha" ] && [ "$served_git_sha" != "$expected_git_sha" ]; then
  rollback_after_public_switch "Primary prod service git sha mismatch after restart."
fi

set_proxy_port "$prod_port"
systemctl --user stop "$next_service" || true
rm -f "$prod_next_current"

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
Invoke-RemoteCommand -Command "bash -s" -InputText $remoteScriptLf
