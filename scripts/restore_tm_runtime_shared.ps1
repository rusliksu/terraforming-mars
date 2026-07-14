param(
    [string]$HostAlias = "hostkey-codex",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [ValidateSet("staging", "prod")]
    [string]$Environment = "staging",
    [string]$BackupRoot = "D:\tm-vps-archive\20260414_153915",
    [switch]$AllowProdRestore,
    [switch]$AllowReleaseMismatch,
    [switch]$SkipVerify,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

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

function Resolve-BackupEnvironmentRoot {
    param(
        [string]$RootPath,
        [string]$EnvironmentName
    )

    $resolvedRoot = (Resolve-Path $RootPath).Path
    $candidateEnvRoot = Join-Path $resolvedRoot $EnvironmentName
    if ((Test-Path (Join-Path $candidateEnvRoot "metadata.json")) -and (Test-Path (Join-Path $candidateEnvRoot "release.json"))) {
        return $candidateEnvRoot
    }
    if ((Test-Path (Join-Path $resolvedRoot "metadata.json")) -and (Test-Path (Join-Path $resolvedRoot "release.json"))) {
        return $resolvedRoot
    }

    throw "Backup root does not contain a recognizable $EnvironmentName backup set: $RootPath"
}

if ($Environment -eq "prod" -and -not $AllowProdRestore) {
    throw "Prod restore is blocked by default. Pass -AllowProdRestore only for an explicit recovery operation."
}

$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"
if (-not (Test-Path $verifyScript)) {
    throw "Missing verify script: $verifyScript"
}

$backupEnvRoot = Resolve-BackupEnvironmentRoot -RootPath $BackupRoot -EnvironmentName $Environment
$metadataPath = Join-Path $backupEnvRoot "metadata.json"
$releasePath = Join-Path $backupEnvRoot "release.json"
$metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
$release = Get-Content -LiteralPath $releasePath -Raw | ConvertFrom-Json

if ([string]$metadata.environment -ne $Environment) {
    throw "Backup metadata environment mismatch. Expected $Environment but got $($metadata.environment)."
}

$archiveName = [string]$metadata.archiveName
if ([string]::IsNullOrWhiteSpace($archiveName)) {
    throw "Backup metadata is missing archiveName in $metadataPath"
}
$archivePath = Join-Path $backupEnvRoot $archiveName
if (-not (Test-Path $archivePath)) {
    throw "Backup archive listed in metadata is missing: $archivePath"
}

$includedItems = @($metadata.includedItems | ForEach-Object { [string]$_ })
if ($includedItems.Count -eq 0) {
    throw "Backup metadata has no includedItems in $metadataPath"
}

$runtimeRoot = if ($Environment -eq "staging") {
    "/home/openclaw/tm-runtime/staging"
} else {
    "/home/openclaw/tm-runtime/prod"
}
$currentLink = "$runtimeRoot/current"
$sharedRoot = "$runtimeRoot/shared"
$serviceName = if ($Environment -eq "staging") { "tm-server-staging" } else { "tm-server" }
$eloServiceName = if ($Environment -eq "prod") { "tm-elo" } else { "" }
$healthUrl = if ($Environment -eq "staging") { "http://127.0.0.1:8084" } else { "http://127.0.0.1:8081" }
$eloHealthUrl = if ($Environment -eq "prod") { "http://127.0.0.1:8082/api/elo-submit" } else { "" }

$backupStamp = [System.IO.Path]::GetFileName((Split-Path -Parent $backupEnvRoot))
$remoteUploadRoot = "/tmp/tm-runtime-restore-$PID"
$remoteArchive = "$remoteUploadRoot/$archiveName"
$remoteMetadata = "$remoteUploadRoot/metadata.json"
$remoteRelease = "$remoteUploadRoot/release.json"
$expectedArtifactSha = [string]$release.artifactSha256
$expectedGitSha = [string]$release.gitSha
$expectedDependencySha = [string]$release.dependencySha256

$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

runtime_root="__RUNTIME_ROOT__"
current_link="__CURRENT_LINK__"
shared_root="__SHARED_ROOT__"
service="__SERVICE__"
elo_service="__ELO_SERVICE__"
health_url="__HEALTH__"
elo_health_url="__ELO_HEALTH__"
remote_archive="__REMOTE_ARCHIVE__"
remote_metadata="__REMOTE_METADATA__"
remote_release="__REMOTE_RELEASE__"
allow_release_mismatch="__ALLOW_RELEASE_MISMATCH__"
dry_run="__DRY_RUN__"
backup_stamp="__BACKUP_STAMP__"
release_url="${health_url%/}/release.json"
release_url_fallback="${health_url%/}/assets/release.json"
work_root="/tmp/tm-runtime-restore-work-$$"
restore_backups_root="$runtime_root/restore-backups"

cleanup() {
  rm -rf "$work_root"
}

rollback_data() {
  local item
  systemctl --user stop "$service" || true
  if [ -n "$elo_service" ]; then
    systemctl --user stop "$elo_service" || true
  fi

  for item in "${included_items[@]}"; do
    rm -rf "$shared_root/$item"
    if [ -e "$restore_backup_dir/$item" ]; then
      mv "$restore_backup_dir/$item" "$shared_root/$item"
    fi
  done

  systemctl --user start "$service" || true
  if [ -n "$elo_service" ]; then
    systemctl --user start "$elo_service" || true
  fi
}

trap cleanup EXIT

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
if [ ! -d "$shared_root" ]; then
  echo "Expected shared root at $shared_root" >&2
  exit 1
fi
if [ ! -f "$remote_archive" ] || [ ! -f "$remote_metadata" ] || [ ! -f "$remote_release" ]; then
  echo "Uploaded restore payload is incomplete under $(dirname "$remote_archive")" >&2
  exit 1
fi

current_target="$(readlink -f "$current_link")"
current_release_name="$(basename "$current_target")"
current_release_manifest="$current_target/assets/release.json"
if [ ! -f "$current_release_manifest" ]; then
  echo "Current release manifest missing: $current_release_manifest" >&2
  exit 1
fi

mkdir -p "$work_root"
tar -xzf "$remote_archive" -C "$work_root"

mapfile -t included_items < <(python3 - "$remote_metadata" <<'PY'
import json
import sys

with open(sys.argv[1], encoding='utf-8') as handle:
    data = json.load(handle)
for item in data.get('includedItems', []):
    print(item)
PY
)
if [ "${#included_items[@]}" -eq 0 ]; then
  echo "Restore metadata has no includedItems: $remote_metadata" >&2
  exit 1
fi

backup_artifact_sha="$(python3 - "$remote_release" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as handle:
    data = json.load(handle)
print(data.get('artifactSha256', ''))
PY
)"
backup_git_sha="$(python3 - "$remote_release" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as handle:
    data = json.load(handle)
print(data.get('gitSha', ''))
PY
)"
backup_dependency_sha="$(python3 - "$remote_release" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as handle:
    data = json.load(handle)
print(data.get('dependencySha256', ''))
PY
)"
current_artifact_sha="$(python3 - "$current_release_manifest" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as handle:
    data = json.load(handle)
print(data.get('artifactSha256', ''))
PY
)"
current_git_sha="$(python3 - "$current_release_manifest" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as handle:
    data = json.load(handle)
print(data.get('gitSha', ''))
PY
)"
current_dependency_sha="$(python3 - "$current_release_manifest" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as handle:
    data = json.load(handle)
print(data.get('dependencySha256', ''))
PY
)"

if [ "$allow_release_mismatch" != "1" ]; then
  if [ "$backup_artifact_sha" != "$current_artifact_sha" ] || [ "$backup_git_sha" != "$current_git_sha" ] || [ "$backup_dependency_sha" != "$current_dependency_sha" ]; then
    echo "Backup release metadata does not match current runtime release." >&2
    echo "backup_artifact_sha=$backup_artifact_sha current_artifact_sha=$current_artifact_sha" >&2
    echo "backup_git_sha=$backup_git_sha current_git_sha=$current_git_sha" >&2
    echo "backup_dependency_sha=$backup_dependency_sha current_dependency_sha=$current_dependency_sha" >&2
    echo "Pass -AllowReleaseMismatch only for an explicit recovery scenario." >&2
    exit 1
  fi
fi

print_plan() {
  echo "environment=__ENV__"
  echo "service=$service"
  if [ -n "$elo_service" ]; then
    echo "elo_service=$elo_service"
  fi
  echo "runtime_root=$runtime_root"
  echo "shared_root=$shared_root"
  echo "current_release=$current_release_name"
  echo "included_items=$(IFS=,; echo "${included_items[*]}")"
  echo "backup_stamp=$backup_stamp"
  echo "backup_artifact_sha=$backup_artifact_sha"
  echo "backup_git_sha=$backup_git_sha"
  echo "backup_dependency_sha=$backup_dependency_sha"
}

if [ "$dry_run" = "1" ]; then
  echo "Restore dry run"
  print_plan
  exit 0
fi

restore_backup_dir="$restore_backups_root/${backup_stamp}-$(date +%Y%m%d%H%M%S)"
mkdir -p "$restore_backup_dir"

systemctl --user stop "$service"
if [ -n "$elo_service" ]; then
  systemctl --user stop "$elo_service"
fi

item_moved=0
restore_started=0
item=""

for item in "${included_items[@]}"; do
  if [ ! -e "$work_root/$item" ]; then
    echo "Backup archive is missing expected item: $item" >&2
    rollback_data
    exit 1
  fi
done

for item in "${included_items[@]}"; do
  if [ -e "$shared_root/$item" ]; then
    mv "$shared_root/$item" "$restore_backup_dir/$item"
  fi
done
restore_started=1

for item in "${included_items[@]}"; do
  mv "$work_root/$item" "$shared_root/$item"
done

if ! systemctl --user start "$service"; then
  echo "Service start failed after restore, rolling back data." >&2
  rollback_data
  exit 1
fi

if [ -n "$elo_service" ]; then
  if ! systemctl --user start "$elo_service"; then
    echo "ELO start failed after restore, rolling back data." >&2
    rollback_data
    exit 1
  fi
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
  echo "Health check failed after restore, rolling back data." >&2
  rollback_data
  exit 1
fi

if [ -n "$elo_health_url" ]; then
  elo_healthy=0
  for attempt in $(seq 1 10); do
    if curl -fsS "$elo_health_url" >/dev/null 2>&1; then
      elo_healthy=1
      break
    fi
    sleep 2
  done
  if [ "$elo_healthy" -ne 1 ]; then
    echo "ELO health check failed after restore, rolling back data." >&2
    rollback_data
    exit 1
  fi
fi

served_release_json=""
if ! served_release_json="$(curl -fsS "$release_url")"; then
  if ! served_release_json="$(curl -fsS "$release_url_fallback")"; then
    echo "Release manifest fetch failed after restore, rolling back data." >&2
    rollback_data
    exit 1
  fi
fi

served_artifact_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("artifactSha256", ""))')"
served_git_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("gitSha", ""))')"
served_dependency_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("dependencySha256", ""))')"

if [ "$served_artifact_sha" != "$current_artifact_sha" ] || [ "$served_git_sha" != "$current_git_sha" ] || [ "$served_dependency_sha" != "$current_dependency_sha" ]; then
  echo "Served release metadata changed unexpectedly after restore, rolling back data." >&2
  rollback_data
  exit 1
fi

echo "Restore ok"
print_plan
echo "restore_backup_dir=$restore_backup_dir"
'@

$remoteScript = $remoteScript.Replace("__RUNTIME_ROOT__", $runtimeRoot)
$remoteScript = $remoteScript.Replace("__CURRENT_LINK__", $currentLink)
$remoteScript = $remoteScript.Replace("__SHARED_ROOT__", $sharedRoot)
$remoteScript = $remoteScript.Replace("__SERVICE__", $serviceName)
$remoteScript = $remoteScript.Replace("__ELO_SERVICE__", $eloServiceName)
$remoteScript = $remoteScript.Replace("__HEALTH__", $healthUrl)
$remoteScript = $remoteScript.Replace("__ELO_HEALTH__", $eloHealthUrl)
$remoteScript = $remoteScript.Replace("__REMOTE_ARCHIVE__", $remoteArchive)
$remoteScript = $remoteScript.Replace("__REMOTE_METADATA__", $remoteMetadata)
$remoteScript = $remoteScript.Replace("__REMOTE_RELEASE__", $remoteRelease)
$remoteScript = $remoteScript.Replace("__ALLOW_RELEASE_MISMATCH__", $(if ($AllowReleaseMismatch) { "1" } else { "0" }))
$remoteScript = $remoteScript.Replace("__DRY_RUN__", $(if ($DryRun) { "1" } else { "0" }))
$remoteScript = $remoteScript.Replace("__BACKUP_STAMP__", $backupStamp)
$remoteScript = $remoteScript.Replace("__ENV__", $Environment)

Write-Host "TM runtime shared restore"
Write-Host "Host                : $HostAlias"
Write-Host "Environment         : $Environment"
Write-Host "BackupEnvRoot       : $backupEnvRoot"
Write-Host "Archive             : $archivePath"
Write-Host "IncludedItems       : $($includedItems -join ', ')"
Write-Host "Expected release    : artifact=$expectedArtifactSha git=$expectedGitSha deps=$expectedDependencySha"
Write-Host "AllowReleaseMismatch: $AllowReleaseMismatch"
Write-Host "DryRun              : $DryRun"
Write-Host ""

$tempScript = New-TemporaryFile
$remoteScriptPath = "$remoteUploadRoot/restore.sh"

try {
    Write-Utf8NoBomFile -Path $tempScript.FullName -Content $remoteScript

    Invoke-RemoteCommand -Command "mkdir -p '$remoteUploadRoot'" | Out-Null

    Copy-RemoteFile -LocalPath $tempScript.FullName -RemotePath $remoteScriptPath
    Copy-RemoteFile -LocalPath $archivePath -RemotePath $remoteArchive
    Copy-RemoteFile -LocalPath $metadataPath -RemotePath $remoteMetadata
    Copy-RemoteFile -LocalPath $releasePath -RemotePath $remoteRelease

    Invoke-RemoteCommand -Command "chmod 700 '$remoteScriptPath' && bash '$remoteScriptPath'"
} finally {
    Invoke-RemoteCommand -Command "rm -rf '$remoteUploadRoot'" | Out-Null
    if (Test-Path $tempScript.FullName) {
        Remove-Item -LiteralPath $tempScript.FullName -Force
    }
}

if (-not $DryRun -and -not $SkipVerify) {
    & pwsh -File $verifyScript -Environment $Environment -RequireReleaseManifest
    if ($LASTEXITCODE -ne 0) {
        throw "Post-restore verification failed."
    }
}
