param(
    [string]$HostAlias = "hostkey-codex",
    [string]$OutputPath,
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

$remoteScript = @'
set -euo pipefail
python3 - <<'PY'
import datetime
import fcntl
import json
import os
import pathlib
import subprocess


def service_state(name):
    result = subprocess.run(
        [
            "systemctl", "--user", "show", name,
            "--property=ActiveState,SubState,MainPID,ActiveEnterTimestamp,ActiveEnterTimestampMonotonic",
        ],
        check=False,
        text=True,
        capture_output=True,
    )
    values = {}
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            key, separator, value = line.partition("=")
            if separator:
                values[key] = value
    return {
        "activeState": values.get("ActiveState", "unknown"),
        "subState": values.get("SubState", "unknown"),
        "mainPid": values.get("MainPID", ""),
        "activeEnterTimestamp": values.get("ActiveEnterTimestamp", ""),
        "activeEnterTimestampMonotonic": values.get("ActiveEnterTimestampMonotonic", ""),
        "queryExitCode": result.returncode,
    }


def release_state(environment, service):
    runtime_root = pathlib.Path("/home/openclaw/tm-runtime") / environment
    current = runtime_root / "current"
    target = str(current.resolve(strict=False)) if current.exists() or current.is_symlink() else ""
    manifest_path = current / "assets" / "release.json"
    manifest = None
    manifest_error = ""
    if manifest_path.is_file():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
        except Exception as error:
            manifest_error = str(error)
    return {
        "environment": environment,
        "runtimeRoot": str(runtime_root),
        "currentLink": str(current),
        "currentTarget": target,
        "manifestPath": str(manifest_path),
        "manifest": manifest,
        "manifestError": manifest_error,
        "serviceName": service,
        "service": service_state(service),
    }


lock_path = pathlib.Path("/home/openclaw/tm-runtime/.deploy.lock")
lock_info_path = pathlib.Path("/home/openclaw/tm-runtime/.deploy.lock.info")
lock_busy = False
if lock_path.exists():
    with lock_path.open("r") as lock_file:
        try:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        except BlockingIOError:
            lock_busy = True

lock_info = {}
if lock_info_path.is_file():
    for line in lock_info_path.read_text(encoding="utf-8", errors="replace").splitlines():
        key, separator, value = line.partition("=")
        if separator and key in {
            "operation", "environment", "service", "source", "target",
            "git_sha", "artifact_sha", "required_git_sha", "required_artifact_sha",
            "started_at", "pid",
        }:
            lock_info[key] = value

result = {
    "schemaVersion": 1,
    "capturedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "deployLock": {
        "path": str(lock_path),
        "busy": lock_busy,
        "infoPath": str(lock_info_path),
        "info": lock_info,
    },
    "environments": {
        "prod": release_state("prod", "tm-server"),
        "staging": release_state("staging", "tm-server-staging"),
    },
}
print(json.dumps(result, separators=(",", ":")))
PY
'@

$remoteJson = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $remoteScript
$result = (($remoteJson | Out-String).Trim()) | ConvertFrom-Json
$result | Add-Member -NotePropertyName hostAlias -NotePropertyValue $HostAlias
$json = $result | ConvertTo-Json -Depth 12

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $parent = Split-Path -Parent $OutputPath
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    Set-Content -LiteralPath $OutputPath -Value $json -Encoding UTF8
}

if ($OutputJson) {
    $json
    exit 0
}

Write-Host "TM release state snapshot"
Write-Host "Captured : $($result.capturedAtUtc)"
Write-Host "Host     : $HostAlias"
Write-Host "Lock busy: $($result.deployLock.busy)"
foreach ($environment in @("prod", "staging")) {
    $state = $result.environments.$environment
    Write-Host "$environment : target=$($state.currentTarget) git=$($state.manifest.gitSha) artifact=$($state.manifest.artifactSha256) service=$($state.service.activeState)/$($state.service.subState)"
}
