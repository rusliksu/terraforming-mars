param(
    [string]$HostAlias = "vps",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [ValidateSet("staging", "prod")]
    [string]$Environment = "staging",
    [string]$TargetRelease,
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

$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"
if (-not (Test-Path $verifyScript)) {
    throw "Missing verify script: $verifyScript"
}

$runtimeRoot = if ($Environment -eq "staging") {
    "/home/openclaw/tm-runtime/staging"
} else {
    "/home/openclaw/tm-runtime/prod"
}
$currentLink = "$runtimeRoot/current"
$releasesRoot = "$runtimeRoot/releases"
$serviceName = if ($Environment -eq "staging") { "tm-server-staging" } else { "tm-server" }
$eloServiceName = if ($Environment -eq "prod") { "tm-elo" } else { "" }
$healthUrl = if ($Environment -eq "staging") { "http://127.0.0.1:8084" } else { "http://127.0.0.1:8081" }
$eloHealthUrl = if ($Environment -eq "prod") { "http://127.0.0.1:8082/api/elo-submit" } else { "" }

$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

runtime_root="__RUNTIME_ROOT__"
current_link="__CURRENT_LINK__"
releases_root="__RELEASES_ROOT__"
service="__SERVICE__"
elo_service="__ELO_SERVICE__"
health_url="__HEALTH__"
elo_health_url="__ELO_HEALTH__"
target_release="__TARGET_RELEASE__"
dry_run="__DRY_RUN__"
release_url="${health_url%/}/release.json"
release_url_fallback="${health_url%/}/assets/release.json"

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
  echo "Expected current link at $current_link" >&2
  exit 1
fi

current_target="$(readlink -f "$current_link")"
current_name="$(basename "$current_target")"

mapfile -t release_names < <(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
if [ "${#release_names[@]}" -eq 0 ]; then
  echo "No releases found under $releases_root" >&2
  exit 1
fi

resolved_target=""
if [ -n "$target_release" ]; then
  if [ ! -d "$releases_root/$target_release" ]; then
    echo "Requested target release does not exist: $target_release" >&2
    exit 1
  fi
  resolved_target="$target_release"
else
  for candidate in "${release_names[@]}"; do
    if [ "$candidate" != "$current_name" ]; then
      resolved_target="$candidate"
      break
    fi
  done
fi

if [ -z "$resolved_target" ]; then
  echo "Could not resolve a rollback target. Current release is $current_name and no previous release is available." >&2
  exit 1
fi

if [ "$resolved_target" = "$current_name" ]; then
  echo "Rollback target is already current: $resolved_target" >&2
  exit 1
fi

target_dir="$releases_root/$resolved_target"
target_manifest="$target_dir/assets/release.json"
if [ ! -f "$target_manifest" ]; then
  echo "Target release is missing assets/release.json: $target_dir" >&2
  exit 1
fi

expected_artifact_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("artifactSha256", ""))' "$target_manifest")"
expected_git_sha="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get("gitSha", ""))' "$target_manifest")"

print_plan() {
  echo "environment=__ENV__"
  echo "service=$service"
  if [ -n "$elo_service" ]; then
    echo "elo_service=$elo_service"
  fi
  echo "runtime_root=$runtime_root"
  echo "current_link=$current_link"
  echo "current_release=$current_name"
  echo "target_release=$resolved_target"
  echo "target_dir=$target_dir"
  echo "health_url=$health_url"
  echo "expected_artifact_sha=$expected_artifact_sha"
  echo "expected_git_sha=$expected_git_sha"
}

if [ "$dry_run" = "1" ]; then
  echo "Rollback dry run"
  print_plan
  exit 0
fi

rollback_back() {
  ln -sfn "$current_target" "$current_link"
  systemctl --user restart "$service" || true
  if [ -n "$elo_service" ]; then
    systemctl --user restart "$elo_service" || true
  fi
}

ln -sfn "$target_dir" "$current_link"

if ! systemctl --user restart "$service"; then
  echo "Service restart failed, rolling back to $current_name" >&2
  rollback_back
  exit 1
fi

if [ -n "$elo_service" ]; then
  if ! systemctl --user restart "$elo_service"; then
    echo "ELO restart failed, rolling back to $current_name" >&2
    rollback_back
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
  echo "Health check failed after rollback, restoring $current_name" >&2
  rollback_back
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
    echo "ELO health check failed after rollback, restoring $current_name" >&2
    rollback_back
    exit 1
  fi
fi

served_release_json=""
if ! served_release_json="$(curl -fsS "$release_url")"; then
  if ! served_release_json="$(curl -fsS "$release_url_fallback")"; then
    echo "Release manifest fetch failed after rollback, restoring $current_name" >&2
    rollback_back
    exit 1
  fi
fi

served_artifact_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("artifactSha256", ""))')"
served_git_sha="$(printf '%s' "$served_release_json" | python3 -c 'import json, sys; print(json.load(sys.stdin).get("gitSha", ""))')"

if [ "$served_artifact_sha" != "$expected_artifact_sha" ] || [ "$served_git_sha" != "$expected_git_sha" ]; then
  echo "Served release does not match target after rollback, restoring $current_name" >&2
  echo "expected_artifact_sha=$expected_artifact_sha actual_artifact_sha=$served_artifact_sha" >&2
  echo "expected_git_sha=$expected_git_sha actual_git_sha=$served_git_sha" >&2
  rollback_back
  exit 1
fi

echo "Rollback ok"
print_plan
'@

$remoteScript = $remoteScript.Replace("__RUNTIME_ROOT__", $runtimeRoot)
$remoteScript = $remoteScript.Replace("__CURRENT_LINK__", $currentLink)
$remoteScript = $remoteScript.Replace("__RELEASES_ROOT__", $releasesRoot)
$remoteScript = $remoteScript.Replace("__SERVICE__", $serviceName)
$remoteScript = $remoteScript.Replace("__ELO_SERVICE__", $eloServiceName)
$remoteScript = $remoteScript.Replace("__HEALTH__", $healthUrl)
$remoteScript = $remoteScript.Replace("__ELO_HEALTH__", $eloHealthUrl)
$remoteScript = $remoteScript.Replace("__TARGET_RELEASE__", $TargetRelease)
$remoteScript = $remoteScript.Replace("__DRY_RUN__", $(if ($DryRun) { "1" } else { "0" }))
$remoteScript = $remoteScript.Replace("__ENV__", $Environment)

Write-Host "TM runtime rollback"
Write-Host "Host        : $HostAlias"
Write-Host "Environment : $Environment"
Write-Host "Target      : $(if ([string]::IsNullOrWhiteSpace($TargetRelease)) { '<previous>' } else { $TargetRelease })"
Write-Host "DryRun      : $DryRun"
Write-Host ""

$tempScript = New-TemporaryFile
$remoteScriptPath = "/tmp/tm-rollback-runtime-$PID.sh"

try {
    Write-Utf8NoBomFile -Path $tempScript.FullName -Content $remoteScript
    Copy-RemoteFile -LocalPath $tempScript.FullName -RemotePath $remoteScriptPath

    Invoke-RemoteCommand -Command "chmod 700 '$remoteScriptPath' && bash '$remoteScriptPath' && rm -f '$remoteScriptPath'"
} finally {
    if (Test-Path $tempScript.FullName) {
        Remove-Item -LiteralPath $tempScript.FullName -Force
    }
}

if (-not $DryRun -and -not $SkipVerify) {
    & pwsh -File $verifyScript -Environment $Environment -RequireReleaseManifest
    if ($LASTEXITCODE -ne 0) {
        throw "Post-rollback verification failed."
    }
}
