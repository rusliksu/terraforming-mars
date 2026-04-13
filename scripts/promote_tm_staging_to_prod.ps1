param(
    [string]$HostAlias = "vps",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$remoteScript = @'
set -euo pipefail

staging="/home/openclaw/terraforming-mars-staging"
prod="/home/openclaw/terraforming-mars"
service="tm-server"
health_url="http://127.0.0.1:8081"
release_url="${health_url%/}/release.json"
release_url_fallback="${health_url%/}/assets/release.json"
work_root="/tmp/tm-promote-$(date +%Y%m%d%H%M%S)"
release_dir="$work_root/release"

rollback() {
  if [ -d "$prod/build" ]; then
    rm -rf "$prod/build"
  fi
  if [ -d "$prod/assets" ]; then
    rm -rf "$prod/assets"
  fi
  if [ -d "$backup_build" ]; then
    mv "$backup_build" "$prod/build"
  fi
  if [ -d "$backup_assets" ]; then
    mv "$backup_assets" "$prod/assets"
  fi
  systemctl --user restart "$service" || true
}

test -f "$staging/build/main.js"
test -f "$staging/build/src/server/server.js"
test -f "$staging/assets/index.html"
test -f "$staging/assets/release.json"

expected_artifact_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("artifactSha256", ""))' "$staging/assets/release.json")"
expected_git_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("gitSha", ""))' "$staging/assets/release.json")"
test -n "$expected_artifact_sha"

mkdir -p "$release_dir"
rsync -a --delete "$staging/build/" "$release_dir/build/"
rsync -a --delete "$staging/assets/" "$release_dir/assets/"

ts="$(date +%Y%m%d%H%M%S)"
backup_build="$prod/build.bak-$ts"
backup_assets="$prod/assets.bak-$ts"

mv "$prod/build" "$backup_build"
mv "$prod/assets" "$backup_assets"
mv "$release_dir/build" "$prod/build"
mv "$release_dir/assets" "$prod/assets"

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
echo "source=$staging"
echo "target=$prod"
echo "service=$service"
echo "health_url=$health_url"
echo "release_url=$release_url"
echo "artifact_sha=$served_artifact_sha"
echo "git_sha=$served_git_sha"
echo "backup_build=$backup_build"
echo "backup_assets=$backup_assets"

rm -rf "$work_root"
'@

Write-Host "Promoting tested staging build to prod on $HostAlias"
Write-Host "Source : /home/openclaw/terraforming-mars-staging"
Write-Host "Target : /home/openclaw/terraforming-mars"
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
