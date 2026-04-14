param(
    [string]$HostAlias = "vps",
    [string]$ArchiveRoot = "D:\tm-vps-archive",
    [int]$KeepNewestBackups = 14,
    [switch]$IncludeDeps,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$backupScript = Join-Path $PSScriptRoot "backup_tm_runtime_shared.ps1"
$pruneScript = Join-Path $PSScriptRoot "prune_tm_backup_archives.ps1"

foreach ($requiredScript in @($backupScript, $pruneScript)) {
    if (-not (Test-Path $requiredScript)) {
        throw "Missing script: $requiredScript"
    }
}

if (-not (Test-Path $ArchiveRoot)) {
    New-Item -ItemType Directory -Path $ArchiveRoot -Force | Out-Null
}
$logsRoot = Join-Path $ArchiveRoot "logs"
if (-not (Test-Path $logsRoot)) {
    New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $logsRoot "tm-runtime-backup-$stamp.log"

try {
    Start-Transcript -LiteralPath $logPath -Force | Out-Null

    Write-Host "TM backup maintenance"
    Write-Host "HostAlias         : $HostAlias"
    Write-Host "ArchiveRoot       : $ArchiveRoot"
    Write-Host "KeepNewestBackups : $KeepNewestBackups"
    Write-Host "IncludeDeps       : $IncludeDeps"
    Write-Host "DryRun            : $DryRun"
    Write-Host ""

    & $backupScript -HostAlias $HostAlias -LocalArchiveRoot $ArchiveRoot -IncludeDeps:$IncludeDeps -DryRun:$DryRun
    if ($LASTEXITCODE -ne 0) {
        throw "Backup step failed."
    }

    Write-Host ""
    & $pruneScript -ArchiveRoot $ArchiveRoot -KeepNewestBackups $KeepNewestBackups -DryRun:$DryRun
    if ($LASTEXITCODE -ne 0) {
        throw "Prune step failed."
    }
} finally {
    try {
        Stop-Transcript | Out-Null
    } catch {
    }
}

