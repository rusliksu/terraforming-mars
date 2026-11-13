<#
.SYNOPSIS
    Compact old finished Terraforming Mars games: keep the final save, remove earlier saves.

.DESCRIPTION
    Finished games keep every intermediate save, which is most of the SQLite file size.
    This script removes saves older than the final one for finished games whose last save
    is at least -MinIdleDays old. The final save, participants, results and completion
    record stay intact, so the game still loads and history is preserved.

    Dry run by default. -Apply requires -AllowBulk. Every deleted row is exported into a
    local SQL backup first and replayed into a scratch database before deletion.
    Prod requires -AllowProd.

    The database file does not shrink automatically: SQLite reuses freed pages. Run a
    separate VACUUM (with the server stopped) to return space to the OS.
#>
param(
    [ValidateSet("staging", "prod")]
    [string]$Environment = "staging",

    [switch]$AllowProd,

    [int]$MinIdleDays = 30,

    [int]$MaxGames = 5,

    [int]$MaxSavesPerRun = 2000,

    [switch]$AllowBulk,

    [switch]$Apply,

    [switch]$SkipBackupVerify,

    [string]$BackupDir = "",

    [string]$HostAlias = "hostkey-codex",

    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Get-DbPath {
    switch ($Environment) {
        "staging" { return "/home/openclaw/tm-runtime/staging/shared/db/game.db" }
        default { return "/home/openclaw/tm-runtime/prod/shared/db/game.db" }
    }
}

function Invoke-RemoteJson {
    param([string]$Sql)

    $body = @'
DB="__DB__"
sqlite3 -readonly "file:$DB?mode=ro" -json <<'SQL'
__SQL__
SQL
'@
    $body = $body.Replace('__DB__', (Get-DbPath)).Replace('__SQL__', $Sql)
    $output = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $body
    $text = (($output | Out-String).Trim())
    if ([string]::IsNullOrWhiteSpace($text)) { return @() }
    return @($text | ConvertFrom-Json)
}

function ConvertTo-SqlIdList {
    param([string[]]$Ids)
    $quoted = foreach ($id in $Ids) {
        Assert-True ($id -match '^g[0-9a-z]+$') "Refusing an id that is not a TM game id: $id"
        "'" + $id + "'"
    }
    return ($quoted -join ",")
}

function Get-ArchivedIds {
    param([string[]]$Ids)
    if ($Ids.Count -eq 0) { return @() }
    $idList = ConvertTo-SqlIdList -Ids $Ids
    $sql = "SELECT DISTINCT game_id AS gameId FROM history_archives WHERE game_id IN (" + $idList + ");"
    return @(Invoke-RemoteJson -Sql $sql | ForEach-Object { $_.gameId })
}

# One row per finished game: number of saves, final save, and the age of that final save.
function Get-FinishedCandidates {
    $sql = @'
WITH finished AS (SELECT game_id FROM completed_game),
lasts AS (
  SELECT g.game_id AS gameId, MAX(g.save_id) AS lastSaveId, COUNT(*) AS saves
  FROM games AS g
  WHERE g.game_id IN (SELECT game_id FROM finished)
  GROUP BY g.game_id
)
SELECT l.gameId AS gameId, l.saves AS saves, l.lastSaveId AS lastSaveId,
       (SELECT players FROM games WHERE game_id = l.gameId AND save_id = l.lastSaveId) AS players,
       (SELECT CAST(strftime('%s','now') AS INTEGER) - created_time FROM games
         WHERE game_id = l.gameId AND save_id = l.lastSaveId) AS idleSeconds
FROM lasts AS l
WHERE l.saves > 1
ORDER BY idleSeconds DESC;
'@
    return @(Invoke-RemoteJson -Sql $sql)
}

function Get-RemovableBytes {
    param([object[]]$Games)
    $conditions = foreach ($g in $Games) {
        "(game_id = " + ("'" + $g.gameId + "'") + " AND save_id < " + [int]$g.lastSaveId + ")"
    }
    $where = $conditions -join " OR "
    $sql = "SELECT COALESCE(SUM(length(game)), 0) AS bytes FROM games WHERE " + $where + ";"
    return [int64](@(Invoke-RemoteJson -Sql $sql)[0].bytes)
}

function New-SaveBackup {
    param([object[]]$Games, [string]$Stamp)

    $conditions = foreach ($g in $Games) {
        "(game_id = " + ("'" + $g.gameId + "'") + " AND save_id < " + [int]$g.lastSaveId + ")"
    }
    $where = $conditions -join " OR "
    $remotePath = "/tmp/tm-finished-compaction-$Stamp.sql"
    $schemaPath = "/tmp/tm-finished-compaction-$Stamp.schema.sql"
    $scratchPath = "/tmp/tm-finished-compaction-$Stamp.restore.db"
    $countSql = "SELECT count(*) FROM games WHERE " + $where + ";"

    $body = @'
DB="__DB__"
REMOTE="__REMOTE__"
SCHEMA="__SCHEMA__"
SCRATCH="__SCRATCH__"
Q="__COUNTSQL__"
set -eu
: > "$REMOTE"
sqlite3 -readonly "file:$DB?mode=ro" >> "$REMOTE" <<SQL
.mode insert games
SELECT * FROM games WHERE __WHERE__;
SQL
if [ "__VERIFY__" = "1" ]; then
  sqlite3 "$DB" ".schema games" > "$SCHEMA"
  rm -f "$SCRATCH"
  sqlite3 "$SCRATCH" < "$SCHEMA"
  sqlite3 "$SCRATCH" < "$REMOTE"
  original=$(sqlite3 -readonly "file:$DB?mode=ro" "$Q")
  restored=$(sqlite3 -readonly "file:$SCRATCH?mode=ro" "$Q")
  if [ "$original" != "$restored" ]; then
    echo "backup verify failed: original=$original restored=$restored" >&2
    exit 1
  fi
  echo "backup verified: $original"
  rm -f "$SCRATCH" "$SCHEMA"
fi
wc -l < "$REMOTE"
'@
    $body = $body.Replace('__DB__', (Get-DbPath))
    $body = $body.Replace('__REMOTE__', $remotePath)
    $body = $body.Replace('__SCHEMA__', $schemaPath)
    $body = $body.Replace('__SCRATCH__', $scratchPath)
    $body = $body.Replace('__WHERE__', $where)
    $body = $body.Replace('__COUNTSQL__', $countSql)
    $body = $body.Replace('__VERIFY__', $(if ($SkipBackupVerify) { '0' } else { '1' }))
    $output = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $body
    $text = (($output | Out-String).Trim())
    if (-not $SkipBackupVerify) {
        Assert-True ($text -match 'backup verified: ') "Backup verification failed: $text"
    }

    if ([string]::IsNullOrWhiteSpace($BackupDir)) {
        $BackupDir = Join-Path (Join-Path $env:TEMP "tm-finished-compaction") $Environment
    }
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    $localPath = Join-Path $BackupDir ("finished-compaction-{0}-{1}.sql" -f $Environment, $Stamp)
    Invoke-TmScpDownload -HostAlias $HostAlias -RemotePath $remotePath -LocalPath $localPath | Out-Null
    return $localPath
}

function Remove-Saves {
    param([object[]]$Games, [string]$BackupPath)

    $conditions = foreach ($g in $Games) {
        "(game_id = " + ("'" + $g.gameId + "'") + " AND save_id < " + [int]$g.lastSaveId + ")"
    }
    $where = $conditions -join " OR "
    $body = @'
DB="__DB__"
set -eu
sqlite3 "$DB" <<'SQL'
BEGIN IMMEDIATE;
DELETE FROM games WHERE __WHERE__;
COMMIT;
SQL
sqlite3 -readonly "file:$DB?mode=ro" "SELECT count(*) FROM games WHERE __WHERE__;"
'@
    $body = $body.Replace('__DB__', (Get-DbPath)).Replace('__WHERE__', $where)
    $output = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $body
    $left = (($output | Out-String).Trim() -split "\r?\n" | Select-Object -Last 1)
    Assert-True ($left -eq "0") "Compaction left removable saves behind (backup: $BackupPath)"
}

Assert-True ($Environment -ne "prod" -or $AllowProd) "Prod compaction needs -AllowProd"
Assert-True ($MinIdleDays -gt 0) "-MinIdleDays must be positive"
Assert-True ($MaxGames -gt 0) "-MaxGames must be positive"

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$result = [ordered]@{
    environment = $Environment
    database = Get-DbPath
    apply = [bool]$Apply
    stamp = $stamp
}

$all = @(Get-FinishedCandidates)
$idleSeconds = $MinIdleDays * 86400
$idle = @($all | Where-Object { $_.idleSeconds -ge $idleSeconds })
Assert-True ($idle.Count -gt 0) ("No finished game has a final save older than {0} day(s)" -f $MinIdleDays)

$archived = @(Get-ArchivedIds -Ids @($idle | ForEach-Object { $_.gameId }))
$eligible = @($idle | Where-Object { $archived -notcontains $_.gameId })
Assert-True ($eligible.Count -gt 0) "Every eligible finished game has a history archive; nothing to compact"
if ($eligible.Count -gt $MaxGames) {
    $eligible = @($eligible | Select-Object -First $MaxGames)
}
$savesToDelete = ($eligible | Measure-Object -Property saves -Sum).Sum - $eligible.Count
Assert-True ($savesToDelete -gt 0) "Nothing to compact: every selected game has a single save"
Assert-True ($savesToDelete -le $MaxSavesPerRun) ("{0} saves selected, above -MaxSavesPerRun {1}; raise the cap deliberately" -f $savesToDelete, $MaxSavesPerRun)

$bytes = Get-RemovableBytes -Games $eligible
$result.mode = if ($Apply) { "compact" } else { "compact-dry-run" }
$result.games = @($eligible)
$result.savesToDelete = [int]$savesToDelete
$result.removableBytes = [int64]$bytes
$result.skippedArchived = @($archived)

if ($Apply) {
    Assert-True ($AllowBulk) "Compaction of several games needs -AllowBulk"
    $backupPath = New-SaveBackup -Games $eligible -Stamp $stamp
    $result.backup = $backupPath
    Remove-Saves -Games $eligible -BackupPath $backupPath
    $result.deletedSaves = [int]$savesToDelete
}

if ($OutputJson) {
    $result | ConvertTo-Json -Depth 6
    return
}

Write-Host ("Finished games in {0}: {1} total, {2} older than {3} day(s), {4} selected" -f
    $Environment, $all.Count, $idle.Count, $MinIdleDays, $eligible.Count)
$eligible | Select-Object gameId, players, saves, lastSaveId,
    @{n = "idleDays"; e = { [math]::Round($_.idleSeconds / 86400, 1) }} |
    Format-Table -AutoSize | Out-String | Write-Host
Write-Host ("Removable saves: {0}; approx bytes: {1}" -f $savesToDelete, $bytes)
if ($Apply) {
    Write-Host ("Compacted {0} game(s). Backup: {1}" -f $eligible.Count, $result.backup)
    Write-Host "Restore: sqlite3 game.db < <backup file>"
    Write-Host "Disk: file size is unchanged until a VACUUM runs with the server stopped."
} else {
    Write-Host "Dry run: nothing was deleted. Re-run with -Apply -AllowBulk to compact."
}
