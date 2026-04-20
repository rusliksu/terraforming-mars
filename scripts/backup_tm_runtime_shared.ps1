param(
    [string]$HostAlias = "vps",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [ValidateSet("all", "prod", "staging")]
    [string]$Environment = "all",
    [string]$LocalArchiveRoot = "D:\tm-vps-archive",
    [switch]$IncludeDeps,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBomFile {
    param(
        [string]$Path,
        [string]$Content
    )

    $normalized = $Content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($Path, $normalized, [System.Text.UTF8Encoding]::new($false))
}

function Get-ResolvedSshHost {
    if ($HostAlias -eq 'vps') {
        return $FallbackSshHost
    }
    return $HostAlias
}

function Invoke-RemoteViaParamiko {
    param(
        [string]$Command,
        [string]$InputText = "",
        [int]$TimeoutSeconds = 1800
    )

    $resolvedHost = Get-ResolvedSshHost
    $commandBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Command))
    $inputBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($InputText))
    $pythonScript = @"
import base64
import pathlib
import sys

import paramiko

host = r"$resolvedHost"
user = r"$FallbackSshUser"
key_path = pathlib.Path(r"$FallbackSshKeyPath").expanduser()
command = base64.b64decode(r"$commandBase64").decode("utf-8")
input_text = base64.b64decode(r"$inputBase64").decode("utf-8")

key = paramiko.Ed25519Key.from_private_key_file(str(key_path))
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, pkey=key, timeout=20)
try:
    stdin, stdout, stderr = client.exec_command(command, timeout=$TimeoutSeconds)
    if input_text:
        stdin.write(input_text)
    stdin.channel.shutdown_write()
    sys.stdout.write(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err:
        sys.stderr.write(err)
    sys.exit(stdout.channel.recv_exit_status())
finally:
    client.close()
"@
    $output = $pythonScript | python -
    if ($LASTEXITCODE -ne 0) {
        throw "Paramiko remote command failed for host $resolvedHost"
    }
    return $output
}

function Copy-RemoteFileViaParamiko {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )

    $resolvedHost = Get-ResolvedSshHost
    $resolvedLocalPath = (Resolve-Path $LocalPath).Path
    $localBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($resolvedLocalPath))
    $remoteBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($RemotePath))
    $pythonScript = @"
import base64
import pathlib

import paramiko

host = r"$resolvedHost"
user = r"$FallbackSshUser"
key_path = pathlib.Path(r"$FallbackSshKeyPath").expanduser()
local_path = base64.b64decode(r"$localBase64").decode("utf-8")
remote_path = base64.b64decode(r"$remoteBase64").decode("utf-8")

key = paramiko.Ed25519Key.from_private_key_file(str(key_path))
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, pkey=key, timeout=20)
try:
    sftp = client.open_sftp()
    try:
        sftp.put(local_path, remote_path)
    finally:
        sftp.close()
finally:
    client.close()
"@
    $pythonScript | python - | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Paramiko SFTP upload failed for host $resolvedHost"
    }
}

function Copy-RemoteDirectoryFromParamiko {
    param(
        [string]$RemotePath,
        [string]$LocalPath
    )

    $resolvedHost = Get-ResolvedSshHost
    $resolvedLocalPath = [System.IO.Path]::GetFullPath($LocalPath)
    $remoteBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($RemotePath))
    $localBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($resolvedLocalPath))
    $pythonScript = @"
import base64
import os
import pathlib
import posixpath
import stat

import paramiko

host = r"$resolvedHost"
user = r"$FallbackSshUser"
key_path = pathlib.Path(r"$FallbackSshKeyPath").expanduser()
remote_path = base64.b64decode(r"$remoteBase64").decode("utf-8")
local_path = base64.b64decode(r"$localBase64").decode("utf-8")

key = paramiko.Ed25519Key.from_private_key_file(str(key_path))
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, pkey=key, timeout=20)

def download_tree(sftp, source, target):
    attrs = sftp.stat(source)
    if stat.S_ISDIR(attrs.st_mode):
        os.makedirs(target, exist_ok=True)
        for entry in sftp.listdir_attr(source):
            child_source = posixpath.join(source, entry.filename)
            child_target = os.path.join(target, entry.filename)
            if stat.S_ISDIR(entry.st_mode):
                download_tree(sftp, child_source, child_target)
            else:
                os.makedirs(os.path.dirname(child_target), exist_ok=True)
                sftp.get(child_source, child_target)
    else:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        sftp.get(source, target)

try:
    sftp = client.open_sftp()
    try:
        os.makedirs(local_path, exist_ok=True)
        for entry in sftp.listdir_attr(remote_path):
            child_source = posixpath.join(remote_path, entry.filename)
            child_target = os.path.join(local_path, entry.filename)
            if stat.S_ISDIR(entry.st_mode):
                download_tree(sftp, child_source, child_target)
            else:
                sftp.get(child_source, child_target)
    finally:
        sftp.close()
finally:
    client.close()
"@
    $pythonScript | python - | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Paramiko SFTP download failed for host $resolvedHost"
    }
}

function Copy-RemoteFile {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )

    & scp.exe $LocalPath "${HostAlias}:$RemotePath"
    if ($LASTEXITCODE -eq 0) {
        return
    }
    Write-Warning "Native scp failed for $HostAlias. Falling back to paramiko SFTP."
    Copy-RemoteFileViaParamiko -LocalPath $LocalPath -RemotePath $RemotePath
}

function Copy-RemoteDirectoryFromRemote {
    param(
        [string]$RemotePath,
        [string]$LocalPath
    )

    & scp.exe -r "${HostAlias}:$RemotePath/." $LocalPath
    if ($LASTEXITCODE -eq 0) {
        return
    }
    Write-Warning "Native scp download failed for $HostAlias. Falling back to paramiko SFTP."
    Copy-RemoteDirectoryFromParamiko -RemotePath $RemotePath -LocalPath $LocalPath
}

function Invoke-RemoteCommand {
    param(
        [string]$Command,
        [string]$InputText = "",
        [int]$TimeoutSeconds = 1800
    )

    if ([string]::IsNullOrEmpty($InputText)) {
        $output = & ssh.exe $HostAlias $Command 2>&1
    } else {
        $output = $InputText | & ssh.exe $HostAlias $Command 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        return $output
    }

    Write-Warning "Native ssh failed for $HostAlias. Falling back to paramiko."
    return Invoke-RemoteViaParamiko -Command $Command -InputText $InputText -TimeoutSeconds $TimeoutSeconds
}

function Require-LocalArchiveRoot {
    param(
        [string]$PathValue
    )

    if (-not (Test-Path $PathValue)) {
        New-Item -ItemType Directory -Path $PathValue -Force | Out-Null
    }

    $item = Get-Item -LiteralPath $PathValue
    if (-not $item.PSIsContainer) {
        throw "LocalArchiveRoot must be a directory: $PathValue"
    }
}

Require-LocalArchiveRoot -PathValue $LocalArchiveRoot

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$localRunRoot = Join-Path $LocalArchiveRoot $stamp

$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

environment="__ENVIRONMENT__"
include_deps="__INCLUDE_DEPS__"
stamp="__STAMP__"
backup_root="/tmp/tm-runtime-shared-backup-$stamp"

join_csv() {
  if [ "$#" -eq 0 ]; then
    echo "-"
    return
  fi

  local first=1
  local item
  for item in "$@"; do
    if [ "$first" -eq 1 ]; then
      printf '%s' "$item"
      first=0
    else
      printf ',%s' "$item"
    fi
  done
  printf '\n'
}

backup_env() {
  local env_name="$1"
  local runtime_root="/home/openclaw/tm-runtime/$env_name"
  local current_link="$runtime_root/current"
  local shared_root="$runtime_root/shared"
  local env_root="$backup_root/$env_name"
  local archive_name="tm-runtime-shared-$env_name-$stamp.tar.gz"
  local archive_path="$env_root/$archive_name"
  local current_target=""
  local current_release=""
  local release_manifest=""
  local included_items=()
  local item

  if [ ! -L "$current_link" ]; then
    echo "Expected current symlink at $current_link" >&2
    exit 1
  fi

  if [ ! -d "$shared_root" ]; then
    echo "Expected shared root at $shared_root" >&2
    exit 1
  fi

  current_target="$(readlink -f "$current_link")"
  current_release="$(basename "$current_target")"
  release_manifest="$current_target/assets/release.json"

  mkdir -p "$env_root"
  if [ -f "$release_manifest" ]; then
    cp "$release_manifest" "$env_root/release.json"
  fi

  for item in db elo logs; do
    if [ -e "$shared_root/$item" ]; then
      included_items+=("$item")
    fi
  done
  if [ "$include_deps" = "1" ] && [ -d "$shared_root/deps" ]; then
    included_items+=("deps")
  fi

  if [ "${#included_items[@]}" -eq 0 ]; then
    echo "Nothing to back up for $env_name under $shared_root" >&2
    exit 1
  fi

  tar -czf "$archive_path" -C "$shared_root" "${included_items[@]}"

  python3 - "$env_root/metadata.json" "$env_name" "$runtime_root" "$current_target" "$current_release" "$archive_name" "$include_deps" "${included_items[@]}" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

metadata_path = Path(sys.argv[1])
env_name = sys.argv[2]
runtime_root = Path(sys.argv[3])
current_target = Path(sys.argv[4])
current_release = sys.argv[5]
archive_name = sys.argv[6]
include_deps = sys.argv[7] == "1"
included_items = sys.argv[8:]

release_json_path = metadata_path.with_name("release.json")
release_data = {}
if release_json_path.exists():
    release_data = json.loads(release_json_path.read_text(encoding="utf-8"))

shared_root = runtime_root / "shared"
included_sizes = {}
for item in included_items:
    path = shared_root / item
    if path.is_file():
        included_sizes[item] = path.stat().st_size
    elif path.exists():
        total = 0
        for child in path.rglob("*"):
            if child.is_file():
                total += child.stat().st_size
        included_sizes[item] = total

metadata = {
    "schemaVersion": 1,
    "capturedAtUtc": datetime.now(timezone.utc).isoformat(),
    "environment": env_name,
    "runtimeRoot": str(runtime_root),
    "currentReleaseDir": str(current_target),
    "currentReleaseName": current_release,
    "archiveName": archive_name,
    "includedItems": included_items,
    "includedSizesBytes": included_sizes,
    "includeDeps": include_deps,
    "release": {
        "artifactSha256": release_data.get("artifactSha256", ""),
        "dependencySha256": release_data.get("dependencySha256", ""),
        "gitSha": release_data.get("gitSha", ""),
        "gitBranch": release_data.get("gitBranch", ""),
    },
}

metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
PY

  echo "environment=$env_name"
  echo "current_release=$current_release"
  echo "included_items=$(join_csv "${included_items[@]}")"
  echo "archive_path=$archive_path"
  echo "archive_size_bytes=$(stat -c %s "$archive_path")"
  echo "metadata_path=$env_root/metadata.json"
  if [ -f "$env_root/release.json" ]; then
    echo "release_manifest_path=$env_root/release.json"
  fi
}

rm -rf "$backup_root"
mkdir -p "$backup_root"

echo "backup_root=$backup_root"
echo "mode=$(if [ "$include_deps" = "1" ]; then printf '%s' 'with-deps'; else printf '%s' 'mutable-only'; fi)"

case "$environment" in
  all)
    backup_env "prod"
    echo "---"
    backup_env "staging"
    ;;
  prod)
    backup_env "prod"
    ;;
  staging)
    backup_env "staging"
    ;;
esac
'@

$remoteScript = $remoteScript.Replace("__ENVIRONMENT__", $Environment)
$remoteScript = $remoteScript.Replace("__INCLUDE_DEPS__", $(if ($IncludeDeps) { "1" } else { "0" }))
$remoteScript = $remoteScript.Replace("__STAMP__", $stamp)

Write-Host "TM runtime shared backup"
Write-Host "Host            : $HostAlias"
Write-Host "Environment     : $Environment"
Write-Host "LocalArchiveRoot: $LocalArchiveRoot"
Write-Host "LocalRunRoot    : $localRunRoot"
Write-Host "IncludeDeps     : $IncludeDeps"
Write-Host "Mode            : $(if ($DryRun) { 'dry-run' } else { 'capture + download' })"
Write-Host ""

$tempScript = New-TemporaryFile
$remoteScriptPath = "/tmp/tm-backup-runtime-shared-$PID.sh"

try {
    Write-Utf8NoBomFile -Path $tempScript.FullName -Content $remoteScript
    Copy-RemoteFile -LocalPath $tempScript.FullName -RemotePath $remoteScriptPath

    if ($DryRun) {
        $remoteOutput = Invoke-RemoteCommand -Command "chmod 700 '$remoteScriptPath' && bash '$remoteScriptPath'"

        $backupRootLine = $remoteOutput | Where-Object { $_ -like 'backup_root=*' } | Select-Object -First 1
        $remoteBackupRoot = if ([string]::IsNullOrWhiteSpace($backupRootLine)) {
            ""
        } else {
            $backupRootLine.Substring("backup_root=".Length)
        }

        Write-Host ($remoteOutput -join [Environment]::NewLine)

        $cleanupCommand = if ([string]::IsNullOrWhiteSpace($remoteBackupRoot)) {
            "rm -f '$remoteScriptPath'"
        } else {
            "rm -rf '$remoteBackupRoot' '$remoteScriptPath'"
        }
        Invoke-RemoteCommand -Command $cleanupCommand | Out-Null
        return
    }

    $remoteOutput = Invoke-RemoteCommand -Command "chmod 700 '$remoteScriptPath' && bash '$remoteScriptPath'"

    $backupRootLine = $remoteOutput | Where-Object { $_ -like 'backup_root=*' } | Select-Object -First 1
    if ([string]::IsNullOrWhiteSpace($backupRootLine)) {
        throw "Remote backup did not report backup_root."
    }
    $remoteBackupRoot = $backupRootLine.Substring("backup_root=".Length)

    New-Item -ItemType Directory -Path $localRunRoot -Force | Out-Null
    Copy-RemoteDirectoryFromRemote -RemotePath $remoteBackupRoot -LocalPath $localRunRoot

    $contentsPath = Join-Path $localRunRoot "tm-runtime-shared-backup-contents.txt"
    $contents = Get-ChildItem -LiteralPath $localRunRoot -Recurse -File | Sort-Object FullName | ForEach-Object {
        $relative = $_.FullName.Substring($localRunRoot.Length).TrimStart('\')
        "{0}`t{1}`t{2:o}" -f $relative, $_.Length, $_.LastWriteTimeUtc
    }
    Set-Content -LiteralPath $contentsPath -Value $contents -Encoding UTF8

    $summaryPath = Join-Path $localRunRoot "tm-runtime-shared-backup-summary.txt"
    $summary = @(
        "stamp=$stamp"
        "host=$HostAlias"
        "environment=$Environment"
        "include_deps=$IncludeDeps"
        "remote_backup_root=$remoteBackupRoot"
        "local_backup_root=$localRunRoot"
    )
    $summary += ($remoteOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Set-Content -LiteralPath $summaryPath -Value $summary -Encoding UTF8

    Write-Host "Downloaded backup to $localRunRoot"
    Write-Host ""
    Write-Host ($remoteOutput -join [Environment]::NewLine)

    Invoke-RemoteCommand -Command "rm -rf '$remoteBackupRoot' '$remoteScriptPath'" | Out-Null
} finally {
    if (Test-Path $tempScript.FullName) {
        Remove-Item -LiteralPath $tempScript.FullName -Force
    }
}
