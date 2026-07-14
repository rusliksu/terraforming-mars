param(
    [string]$VpsHost = "hostkey-codex",
    [string]$ArchiveRoot = "/home/openclaw/tm-legacy-checkouts",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

$remoteScript = @'
set -euo pipefail

archive_root="__ARCHIVE_ROOT__"
timestamp="$(date +%Y%m%d-%H%M%S)"
archive_dir="$archive_root/$timestamp"

declare -A targets=(
  [prod]="/home/openclaw/terraforming-mars"
  [staging]="/home/openclaw/terraforming-mars-staging"
)

for service in tm-server tm-server-staging; do
  cwd="$(systemctl --user show -p WorkingDirectory --value "$service")"
  case "$cwd" in
    /home/openclaw/terraforming-mars*|/home/openclaw/terraforming-mars-staging*)
      echo "Service $service still points at legacy checkout: $cwd" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$archive_dir"

for env in prod staging; do
  src="${targets[$env]}"
  if [ ! -e "$src" ]; then
    echo "skip_$env=missing"
    continue
  fi
  dest="$archive_dir/$(basename "$src")"
  mv "$src" "$dest"
  echo "archived_$env=$dest"
done

echo "archive_dir=$archive_dir"
'@

$remoteScript = $remoteScript.Replace("__ARCHIVE_ROOT__", $ArchiveRoot)

Write-Host "Target VPS  : $VpsHost"
Write-Host "ArchiveRoot : $ArchiveRoot"
Write-Host "Mode        : $(if ($DryRun) { 'dry-run' } else { 'archive legacy checkouts' })"

if ($DryRun) {
    Write-Host ""
    Write-Host $remoteScript
    exit 0
}

$remoteScriptLf = $remoteScript -replace "`r`n", "`n"
Invoke-TmSshScript -HostAlias $VpsHost -ScriptText $remoteScriptLf
