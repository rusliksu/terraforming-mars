param(
    [string]$HostAlias = "vps",
    [ValidateSet("prod", "staging")]
    [string]$Environment = "prod",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($Environment -eq "prod") {
    $targetRoot = "/home/openclaw/terraforming-mars"
    $label = "prod"
} else {
    $targetRoot = "/home/openclaw/terraforming-mars-staging"
    $label = "staging"
}

$remoteScript = @'
set -euo pipefail
cd "__TARGETROOT__"
before_count="$(git status --short | wc -l | tr -d ' ')"
stamp="$(date +%Y%m%d-%H%M%S)"
archive_root="/home/openclaw/tm-__LABEL__-checkout-artifacts-$stamp"

echo "target_root=__TARGETROOT__"
echo "before_status_count=$before_count"

if [ "__DRYRUN__" = "True" ]; then
  echo "mode=dry-run"
  echo "--- current src status"
  git status --short src | sed -n '1,200p'
  echo "--- current backup dirs"
  (ls -1d assets.bak-* build.bak-* 2>/dev/null || true) | sed -n '1,120p'
  exit 0
fi

mkdir -p "$archive_root"

if git diff --binary -- src >/dev/null 2>&1; then
  git diff --binary -- src > "$archive_root/src-tracked.diff" || true
fi

mkdir -p "$archive_root/src" "$archive_root/backups"

find src -type f \( -name '*.bak' -o -name '*.bak-*' \) -print0 2>/dev/null | while IFS= read -r -d '' path; do
  dest="$archive_root/$path"
  mkdir -p "$(dirname "$dest")"
  mv "$path" "$dest"
done

for path in src/server/bot src/server/routes/ApiBotTakeover.ts; do
  if [ -e "$path" ]; then
    dest="$archive_root/$path"
    mkdir -p "$(dirname "$dest")"
    mv "$path" "$dest"
  fi
done

for path in assets.bak-* build.bak-*; do
  if [ -e "$path" ]; then
    mv "$path" "$archive_root/backups/"
  fi
done

git restore --source=HEAD --worktree -- src

after_count="$(git status --short | wc -l | tr -d ' ')"
echo "mode=apply"
echo "archive_root=$archive_root"
echo "after_status_count=$after_count"
echo "--- remaining status"
git status --short | sed -n '1,220p'
'@

$remoteScript = $remoteScript.
    Replace('__TARGETROOT__', $targetRoot).
    Replace('__LABEL__', $label).
    Replace('__DRYRUN__', [string]$DryRun)

if ($DryRun) {
    Write-Host "TM checkout cleanup dry run"
    Write-Host "Host        : $HostAlias"
    Write-Host "Environment : $Environment"
    Write-Host "Target      : $targetRoot"
    Write-Host ""
}

& ssh $HostAlias $remoteScript
if ($LASTEXITCODE -ne 0) {
    throw "Remote checkout cleanup failed for $Environment."
}
