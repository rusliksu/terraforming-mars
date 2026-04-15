param(
    [string]$VpsHost = "vps",
    [string]$ProdService = "tm-server.service",
    [string]$ProdNextService = "tm-server-next.service",
    [string]$StagingService = "tm-server-staging.service",
    [string]$EloService = "tm-elo.service",
    [string]$ProdRuntimeRoot = "/home/openclaw/tm-runtime/prod",
    [string]$ProdNextRuntimeRoot = "/home/openclaw/tm-runtime/prod-next",
    [string]$StagingRuntimeRoot = "/home/openclaw/tm-runtime/staging",
    [string]$ProdPort = "8081",
    [string]$ProdHost = "127.0.0.1",
    [string]$ProdNextPort = "8085",
    [string]$ProdNextHost = "127.0.0.1",
    [string]$StagingPort = "8084",
    [string]$StagingHost = "127.0.0.1",
    [string]$DefaultShadowLogDir = "/home/openclaw/repos/tm-tierlist/data/shadow/server-inputs",
    [string]$DefaultStagingUrl = "https://staging.tm.knightbyte.win",
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Invoke-Ssh {
    param([string]$Command)
    & ssh $VpsHost $Command
}

function Get-ServiceEnvironmentMap {
    param([string]$ServiceName)
    $envLine = Invoke-Ssh "systemctl --user show -p Environment $ServiceName"
    $result = @{}
    if ($envLine -notmatch '^Environment=') {
        return $result
    }
    $payload = $envLine.Substring('Environment='.Length).Trim()
    if ([string]::IsNullOrWhiteSpace($payload)) {
        return $result
    }
    foreach ($part in $payload -split ' ') {
        if (-not $part) { continue }
        $kv = $part -split '=', 2
        if ($kv.Count -eq 2) {
            $result[$kv[0]] = $kv[1]
        }
    }
    return $result
}

function Require-Env {
    param(
        [hashtable]$Map,
        [string]$Key,
        [string]$ServiceName
    )
    if ($Map.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace($Map[$Key])) {
        return $Map[$Key]
    }
    throw "Could not find $Key in $ServiceName environment"
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
$templateDir = Join-Path $scriptDir 'systemd'

$prodEnv = Get-ServiceEnvironmentMap -ServiceName $ProdService
$stagingEnv = Get-ServiceEnvironmentMap -ServiceName $StagingService

$prodServerId = Require-Env -Map $prodEnv -Key 'SERVER_ID' -ServiceName $ProdService
$stagingServerId = Require-Env -Map $stagingEnv -Key 'SERVER_ID' -ServiceName $StagingService
$prodNextServerId = "next-$prodServerId"
$shadowLogDir = if ($prodEnv.ContainsKey('SHADOW_LOG_DIR')) { $prodEnv['SHADOW_LOG_DIR'] } else { $DefaultShadowLogDir }
$stagingUrl = if ($stagingEnv.ContainsKey('TM_SERVER_URL')) { $stagingEnv['TM_SERVER_URL'] } else { $DefaultStagingUrl }
$prodCurrentDir = "$ProdRuntimeRoot/current"
$prodNextCurrentDir = "$ProdNextRuntimeRoot/current"
$stagingCurrentDir = "$StagingRuntimeRoot/current"

$prodContent = Render-Template -TemplatePath (Join-Path $templateDir 'tm-server.service.template') -Replacements @{
    '__PROD_CURRENT_DIR__' = $prodCurrentDir
    '__PROD_PORT__' = $ProdPort
    '__PROD_HOST__' = $ProdHost
    '__PROD_SERVER_ID__' = $prodServerId
    '__SHADOW_LOG_DIR__' = $shadowLogDir
}

$stagingContent = Render-Template -TemplatePath (Join-Path $templateDir 'tm-server-staging.service.template') -Replacements @{
    '__STAGING_CURRENT_DIR__' = $stagingCurrentDir
    '__STAGING_PORT__' = $StagingPort
    '__STAGING_HOST__' = $StagingHost
    '__STAGING_SERVER_ID__' = $stagingServerId
    '__STAGING_URL__' = $stagingUrl
}

$prodNextContent = Render-Template -TemplatePath (Join-Path $templateDir 'tm-server-next.service.template') -Replacements @{
    '__PROD_NEXT_CURRENT_DIR__' = $prodNextCurrentDir
    '__PROD_NEXT_PORT__' = $ProdNextPort
    '__PROD_NEXT_HOST__' = $ProdNextHost
    '__PROD_NEXT_SERVER_ID__' = $prodNextServerId
}

$eloContent = Render-Template -TemplatePath (Join-Path $templateDir 'tm-elo.service.template') -Replacements @{
    '__PROD_CURRENT_DIR__' = $prodCurrentDir
}

Write-Host "Target VPS: $VpsHost"
Write-Host "Prod SERVER_ID: $prodServerId"
Write-Host "Prod-next SERVER_ID: $prodNextServerId"
Write-Host "Staging SERVER_ID: $stagingServerId"
Write-Host "Prod current dir: $prodCurrentDir"
Write-Host "Prod-next current dir: $prodNextCurrentDir"
Write-Host "Staging current dir: $stagingCurrentDir"
Write-Host "Shadow log dir: $shadowLogDir"
Write-Host "Staging URL: $stagingUrl"
Write-Host "Mode: $(if ($DryRun) { 'dry-run' } else { 'apply without service restart' })"

if ($DryRun) {
    Write-Host ""
    Write-Host "=== $ProdService ==="
    Write-Host $prodContent
    Write-Host ""
    Write-Host "=== $ProdNextService ==="
    Write-Host $prodNextContent
    Write-Host ""
    Write-Host "=== $StagingService ==="
    Write-Host $stagingContent
    Write-Host ""
    Write-Host "=== $EloService ==="
    Write-Host $eloContent
    exit 0
}

$prodBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($prodContent))
$prodNextBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($prodNextContent))
$stagingBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($stagingContent))
$eloBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($eloContent))

$remoteScript = @"
set -euo pipefail
mkdir -p ~/.config/systemd/user
python3 - <<'PY'
import base64
from pathlib import Path

files = {
    Path.home() / ".config/systemd/user/$ProdService": "$prodBase64",
    Path.home() / ".config/systemd/user/$ProdNextService": "$prodNextBase64",
    Path.home() / ".config/systemd/user/$StagingService": "$stagingBase64",
    Path.home() / ".config/systemd/user/$EloService": "$eloBase64",
}

for path, payload in files.items():
    path.write_text(base64.b64decode(payload).decode("utf-8"), encoding="utf-8")

for dropin_rel in [
    ".config/systemd/user/$ProdService.d/shadow-input.conf",
    ".config/systemd/user/$StagingService.d/telegram-url.conf",
]:
    dropin_path = Path.home() / dropin_rel
    dropin_dir = dropin_path.parent
    if dropin_path.exists():
        dropin_path.unlink()
    if dropin_dir.exists() and not any(dropin_dir.iterdir()):
        dropin_dir.rmdir()
PY
systemctl --user daemon-reload
echo '--- tm-server.service'
systemctl --user cat $ProdService
echo '--- tm-server-next.service'
systemctl --user cat $ProdNextService
echo '--- tm-server-staging.service'
systemctl --user cat $StagingService
echo '--- tm-elo.service'
systemctl --user cat $EloService
"@

Invoke-Ssh $remoteScript
