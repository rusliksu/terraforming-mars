param(
    [string]$VpsHost = "vps",
    [string]$FallbackSshHost = "72.56.84.119",
    [string]$FallbackSshUser = "openclaw",
    [string]$FallbackSshKeyPath = "$HOME\\.ssh\\id_ed25519",
    [string]$ProdSiteName = "tm.knightbyte.win",
    [string]$StagingSiteName = "tm.knightbyte.win-staging",
    [string]$ProdRuntimeRoot = "/home/openclaw/tm-runtime/prod",
    [string]$StagingRuntimeRoot = "/home/openclaw/tm-runtime/staging",
    [string]$ProdPort = "8081",
    [string]$ProdHost = "127.0.0.1",
    [string]$StagingPort = "8084",
    [string]$StagingHost = "127.0.0.1",
    [string]$EloPort = "8082",
    [string]$EloHost = "127.0.0.1",
    [string]$StreamHost = "127.0.0.1",
    [string]$ProdTlsPort = "4444",
    [string]$StagingTlsPort = "4446",
    [string]$BimTlsPort = "4445",
    [string]$MicrosoftTlsPort = "9444",
    [string]$DefaultTlsPort = "8444",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Get-ResolvedSshHost {
    if ($VpsHost -eq 'vps') {
        return $FallbackSshHost
    }
    return $VpsHost
}

function Invoke-RemoteViaParamiko {
    param(
        [string]$Command,
        [int]$TimeoutSeconds = 1800
    )

    $resolvedHost = Get-ResolvedSshHost
    $commandBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Command))
    $pythonScript = @"
import base64
import pathlib
import sys

import paramiko

host = r"$resolvedHost"
user = r"$FallbackSshUser"
key_path = pathlib.Path(r"$FallbackSshKeyPath").expanduser()
command = base64.b64decode(r"$commandBase64").decode("utf-8")

key = paramiko.Ed25519Key.from_private_key_file(str(key_path))
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, pkey=key, timeout=20)
try:
    stdin, stdout, stderr = client.exec_command(command, timeout=$TimeoutSeconds)
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

function Invoke-Ssh {
    param([string]$Command)
    $output = & ssh $VpsHost $Command 2>&1
    if ($LASTEXITCODE -eq 0) {
        return $output
    }
    Write-Warning "Native ssh failed for $VpsHost. Falling back to paramiko."
    return Invoke-RemoteViaParamiko -Command $Command
}

function Render-Template {
    param(
        [string]$TemplatePath,
        [hashtable]$Replacements
    )

    $content = Get-Content -Raw $TemplatePath
    foreach ($entry in $Replacements.GetEnumerator()) {
        $content = $content.Replace($entry.Key, $entry.Value)
    }
    return $content
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$templateDir = Join-Path $scriptDir "nginx"

$prodCurrentDir = "$ProdRuntimeRoot/current"
$stagingCurrentDir = "$StagingRuntimeRoot/current"

$prodContent = Render-Template -TemplatePath (Join-Path $templateDir "tm.knightbyte.win.template") -Replacements @{
    "__PROD_CURRENT_DIR__" = $prodCurrentDir
    "__ELO_HOST__" = $EloHost
    "__ELO_PORT__" = $EloPort
}

$stagingContent = Render-Template -TemplatePath (Join-Path $templateDir "tm.knightbyte.win-staging.template") -Replacements @{
    "__STAGING_CURRENT_DIR__" = $stagingCurrentDir
    "__STAGING_HOST__" = $StagingHost
    "__STAGING_PORT__" = $StagingPort
    "__ELO_HOST__" = $EloHost
    "__ELO_PORT__" = $EloPort
}
$streamContent = Render-Template -TemplatePath (Join-Path $templateDir "stream.conf.template") -Replacements @{
    "__STREAM_HOST__" = $StreamHost
    "__PROD_TLS_PORT__" = $ProdTlsPort
    "__STAGING_TLS_PORT__" = $StagingTlsPort
    "__BIM_TLS_PORT__" = $BimTlsPort
    "__MICROSOFT_TLS_PORT__" = $MicrosoftTlsPort
    "__DEFAULT_TLS_PORT__" = $DefaultTlsPort
}
$prodUpstreamSnippetContent = Render-Template -TemplatePath (Join-Path $templateDir "tm-prod-active-upstream.conf.template") -Replacements @{
    "__PROD_ACTIVE_HOST__" = $ProdHost
    "__PROD_ACTIVE_PORT__" = $ProdPort
}
$sniPorts = "$ProdTlsPort,$StagingTlsPort,$BimTlsPort,$MicrosoftTlsPort,$DefaultTlsPort"

Write-Host "Target VPS: $VpsHost"
Write-Host "Prod current dir: $prodCurrentDir"
Write-Host "Staging current dir: $stagingCurrentDir"
Write-Host "Prod app: $ProdHost`:$ProdPort"
Write-Host "Staging app: $StagingHost`:$StagingPort"
Write-Host "Elo app: $EloHost`:$EloPort"
Write-Host "SNI stream: $StreamHost [$sniPorts]"
Write-Host "Mode: $(if ($DryRun) { 'dry-run' } else { 'apply and reload nginx' })"

if ($DryRun) {
    Write-Host ""
    Write-Host "=== $ProdSiteName ==="
    Write-Host $prodContent
    Write-Host ""
Write-Host "=== $StagingSiteName ==="
Write-Host $stagingContent
Write-Host ""
    Write-Host "=== tm-prod-active-upstream.conf ==="
    Write-Host $prodUpstreamSnippetContent
    Write-Host ""
    Write-Host "=== stream.conf ==="
    Write-Host $streamContent
    exit 0
}

$prodBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($prodContent))
$stagingBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($stagingContent))
$streamBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($streamContent))
$prodUpstreamSnippetBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($prodUpstreamSnippetContent))

$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="/etc/nginx/backup-managed"
mkdir -p "$backup_dir" /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/snippets

if [ -e "/etc/nginx/stream.conf" ]; then
  cp -a "/etc/nginx/stream.conf" "$backup_dir/stream.conf.$timestamp"
fi
if [ -e "/etc/nginx/snippets/tm-prod-active-upstream.conf" ]; then
  cp -a "/etc/nginx/snippets/tm-prod-active-upstream.conf" "$backup_dir/snippets.tm-prod-active-upstream.conf.$timestamp"
fi

for name in "__PROD_SITE__" "__STAGING_SITE__"; do
  for src in "/etc/nginx/sites-enabled/$name" "/etc/nginx/sites-available/$name"; do
    if [ -e "$src" ]; then
      scope="$(basename "$(dirname "$src")")"
      cp -a "$src" "$backup_dir/$scope.$(basename "$src").$timestamp"
    fi
  done
done

python3 - <<'PY'
import base64
from pathlib import Path

files = {
    Path("/etc/nginx/sites-available/__PROD_SITE__"): "__PROD_B64__",
    Path("/etc/nginx/sites-available/__STAGING_SITE__"): "__STAGING_B64__",
    Path("/etc/nginx/snippets/tm-prod-active-upstream.conf"): "__PROD_UPSTREAM_B64__",
    Path("/etc/nginx/stream.conf"): "__STREAM_B64__",
}

for path, payload in files.items():
    path.write_text(base64.b64decode(payload).decode("utf-8"), encoding="utf-8")
PY

ln -sfn "/etc/nginx/sites-available/__PROD_SITE__" "/etc/nginx/sites-enabled/__PROD_SITE__"
ln -sfn "/etc/nginx/sites-available/__STAGING_SITE__" "/etc/nginx/sites-enabled/__STAGING_SITE__"

nginx -t
systemctl reload nginx

echo '--- /etc/nginx/sites-enabled/__PROD_SITE__'
sed -n '1,220p' "/etc/nginx/sites-enabled/__PROD_SITE__"
echo '--- /etc/nginx/sites-enabled/__STAGING_SITE__'
sed -n '1,220p' "/etc/nginx/sites-enabled/__STAGING_SITE__"
echo '--- /etc/nginx/stream.conf'
sed -n '1,220p' "/etc/nginx/stream.conf"
'@
$remoteScript = $remoteScript.Replace("__PROD_SITE__", $ProdSiteName)
$remoteScript = $remoteScript.Replace("__STAGING_SITE__", $StagingSiteName)
$remoteScript = $remoteScript.Replace("__PROD_B64__", $prodBase64)
$remoteScript = $remoteScript.Replace("__STAGING_B64__", $stagingBase64)
$remoteScript = $remoteScript.Replace("__PROD_UPSTREAM_B64__", $prodUpstreamSnippetBase64)
$remoteScript = $remoteScript.Replace("__STREAM_B64__", $streamBase64)

$tempScript = New-TemporaryFile
$remoteScriptPath = "/tmp/tm-sync-nginx-$PID.sh"

try {
    $remoteScriptLf = $remoteScript.Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($tempScript.FullName, $remoteScriptLf, [System.Text.UTF8Encoding]::new($false))
    & scp $tempScript.FullName "${VpsHost}:$remoteScriptPath"
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Native scp failed for $VpsHost. Falling back to paramiko SFTP."
        Copy-RemoteFileViaParamiko -LocalPath $tempScript.FullName -RemotePath $remoteScriptPath
    }

    Invoke-Ssh "chmod 700 '$remoteScriptPath' && sudo '$remoteScriptPath' && rm -f '$remoteScriptPath'"
} finally {
    if (Test-Path $tempScript.FullName) {
        Remove-Item -LiteralPath $tempScript.FullName -Force
    }
}
