param(
    [string]$VpsHost = "vps",
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

function Invoke-Ssh {
    param([string]$Command)
    & ssh $VpsHost $Command
    if ($LASTEXITCODE -ne 0) {
        throw "SSH command failed with exit code $LASTEXITCODE"
    }
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
    "__PROD_HOST__" = $ProdHost
    "__PROD_PORT__" = $ProdPort
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

Write-Host "Target VPS: $VpsHost"
Write-Host "Prod current dir: $prodCurrentDir"
Write-Host "Staging current dir: $stagingCurrentDir"
Write-Host "Prod app: $ProdHost`:$ProdPort"
Write-Host "Staging app: $StagingHost`:$StagingPort"
Write-Host "Elo app: $EloHost`:$EloPort"
Write-Host "SNI stream: $StreamHost [$ProdTlsPort,$StagingTlsPort,$BimTlsPort,$MicrosoftTlsPort,$DefaultTlsPort]"
Write-Host "Mode: $(if ($DryRun) { 'dry-run' } else { 'apply and reload nginx' })"

if ($DryRun) {
    Write-Host ""
    Write-Host "=== $ProdSiteName ==="
    Write-Host $prodContent
    Write-Host ""
    Write-Host "=== $StagingSiteName ==="
    Write-Host $stagingContent
    Write-Host ""
    Write-Host "=== stream.conf ==="
    Write-Host $streamContent
    exit 0
}

$prodBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($prodContent))
$stagingBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($stagingContent))
$streamBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($streamContent))

$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="/etc/nginx/backup-managed"
mkdir -p "$backup_dir" /etc/nginx/sites-available /etc/nginx/sites-enabled

if [ -e "/etc/nginx/stream.conf" ]; then
  cp -a "/etc/nginx/stream.conf" "$backup_dir/stream.conf.$timestamp"
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
$remoteScript = $remoteScript.Replace("__STREAM_B64__", $streamBase64)

$tempScript = New-TemporaryFile
$remoteScriptPath = "/tmp/tm-sync-nginx-$PID.sh"

try {
    $remoteScriptLf = $remoteScript.Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($tempScript.FullName, $remoteScriptLf, [System.Text.UTF8Encoding]::new($false))
    & scp $tempScript.FullName "${VpsHost}:$remoteScriptPath"
    if ($LASTEXITCODE -ne 0) {
        throw "SCP upload failed with exit code $LASTEXITCODE"
    }

    Invoke-Ssh "chmod 700 '$remoteScriptPath' && sudo '$remoteScriptPath' && rm -f '$remoteScriptPath'"
} finally {
    if (Test-Path $tempScript.FullName) {
        Remove-Item -LiteralPath $tempScript.FullName -Force
    }
}
