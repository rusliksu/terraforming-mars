param(
    [string]$ArchiveRoot = "D:\tm-vps-archive",
    [int]$KeepNewestBackups = 14,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($KeepNewestBackups -lt 1) {
    throw "KeepNewestBackups must be at least 1."
}
if (-not (Test-Path $ArchiveRoot)) {
    throw "ArchiveRoot does not exist: $ArchiveRoot"
}

$archiveItem = Get-Item -LiteralPath $ArchiveRoot
if (-not $archiveItem.PSIsContainer) {
    throw "ArchiveRoot must be a directory: $ArchiveRoot"
}

$backupRoots = Get-ChildItem -LiteralPath $ArchiveRoot -Directory |
    Where-Object {
        $_.Name -match '^\d{8}_\d{6}$' -and
        (Test-Path (Join-Path $_.FullName 'tm-runtime-shared-backup-summary.txt'))
    } |
    Sort-Object Name -Descending

$keep = @($backupRoots | Select-Object -First $KeepNewestBackups)
$prune = @($backupRoots | Select-Object -Skip $KeepNewestBackups)

Write-Host "TM backup archive prune"
Write-Host "ArchiveRoot       : $ArchiveRoot"
Write-Host "KeepNewestBackups : $KeepNewestBackups"
Write-Host "Mode              : $(if ($DryRun) { 'dry-run' } else { 'apply' })"
Write-Host "DetectedBackups   : $($backupRoots.Count)"
Write-Host "Keep             : $(if ($keep.Count -gt 0) { ($keep.Name -join ', ') } else { '-' })"
Write-Host "Prune            : $(if ($prune.Count -gt 0) { ($prune.Name -join ', ') } else { '-' })"

if ($DryRun) {
    return
}

foreach ($dir in $prune) {
    Remove-Item -LiteralPath $dir.FullName -Recurse -Force
}

