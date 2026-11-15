param(
    [ValidateSet("staging", "prod")]
    [string]$Environment = "staging",

    # Prod deletion is never implicit: an operator must ask for it explicitly.
    [switch]$AllowProd,

    # Explicit game ids only. Nothing is selected by a pattern or by age alone.
    [string[]]$GameId = @(),

    [switch]$List,

    # Bulk selection: running games whose latest save is at least this old.
    [int]$MinIdleDays = 0,

    # Bulk deletion is a second explicit switch on top of -Apply.
    [switch]$AllowBulk,

    [int]$MaxGames = 50,

    # A game whose latest save is fresher than this is treated as active and refused.
    [int]$MinIdleMinutes = 60,

    # A game with two or more seats is somebody's real match until an operator says otherwise.
    [switch]$AllowMultiplayer,

    # Initial drafting, prelude and CEO phases are fresh by definition; never delete them by accident.
    [switch]$AllowFresh,

    [switch]$Apply,

    # Backups are replayed into a scratch database before anything is deleted.
    [switch]$SkipBackupVerify,

    [string]$BackupDir = "",

    [string]$HostAlias = "hostkey-codex",

    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

$freshPhasePattern = '^(initial_?drafting|corporation_?drafting|prelude|ceos)$'

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

function ConvertTo-SqlIdList {
    param([string[]]$Ids)
    $quoted = foreach ($id in $Ids) {
        Assert-True ($id -match '^g[0-9a-z]+$') "Refusing an id that is not a TM game id: $id"
        "'" + $id + "'"
    }
    return ($quoted -join ",")
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

# Mirrors the prod promote gate: one row per running game with its latest save,
# phase and seat count, so idle time is comparable with the gate.
function Get-RunningGames {
    $sql = @'
SELECT latest.game_id AS gameId, latest.players AS players, latest.save_id AS saveId,
       json_extract(latest.game, '$.phase') AS phase,
       json_extract(latest.game, '$.gameName') AS gameName,
       json_extract(latest.game, '$.generation') AS generation,
       CAST(strftime('%s','now') AS INTEGER) - latest.created_time AS idleSeconds
FROM games AS latest
INNER JOIN (
  SELECT game_id AS gid, MAX(save_id) AS max_save_id FROM games GROUP BY game_id
) AS m ON latest.game_id = m.gid AND latest.save_id = m.max_save_id
WHERE trim(latest.status) = 'running'
ORDER BY idleSeconds DESC;
'@
    return @(Invoke-RemoteJson -Sql $sql)
}

function Get-GameState {
    param([string[]]$Ids)

    $idRows = ($Ids | ForEach-Object { "('" + $_ + "')" }) -join ","
    $sql = @'
WITH ids(game_id) AS (VALUES __IDROWS__)
SELECT ids.game_id AS gameId,
       (SELECT count(*) FROM games WHERE game_id = ids.game_id) AS saves,
       (SELECT count(*) FROM participants WHERE game_id = ids.game_id) AS participants,
       (SELECT count(*) FROM game_results WHERE game_id = ids.game_id) AS results,
       (SELECT count(*) FROM completed_game WHERE game_id = ids.game_id) AS completed,
       (SELECT count(*) FROM history_archives WHERE game_id = ids.game_id) AS archives,
       (SELECT players FROM games WHERE game_id = ids.game_id ORDER BY save_id DESC LIMIT 1) AS players,
       (SELECT json_extract(game, '$.phase') FROM games
         WHERE game_id = ids.game_id ORDER BY save_id DESC LIMIT 1) AS phase,
       (SELECT json_extract(game, '$.gameName') FROM games
         WHERE game_id = ids.game_id ORDER BY save_id DESC LIMIT 1) AS gameName,
       (SELECT json_extract(game, '$.generation') FROM games
         WHERE game_id = ids.game_id ORDER BY save_id DESC LIMIT 1) AS generation,
       (SELECT CAST(strftime('%s','now') AS INTEGER) - created_time FROM games
         WHERE game_id = ids.game_id ORDER BY save_id DESC LIMIT 1) AS idleSeconds
FROM ids;
'@
    $sql = $sql.Replace('__IDROWS__', $idRows)
    return @(Invoke-RemoteJson -Sql $sql)
}

function Get-ArchivedIds {
    param([string[]]$Ids)

    $idList = ConvertTo-SqlIdList -Ids $Ids
    $sql = "SELECT DISTINCT game_id AS gameId FROM history_archives WHERE game_id IN (" + $idList + ");"
    return @(Invoke-RemoteJson -Sql $sql | ForEach-Object { $_.gameId })
}

function Test-GameDeletable {
    param([object]$State)

    $problems = @()
    $label = $State.gameId
    if ($State.gameName) { $label = $State.gameId + " (" + $State.gameName + ")" }
    if ($State.archives -gt 0) {
        $problems += ("{0}: has {1} history archive(s)" -f $label, $State.archives)
    }
    if ($State.idleSeconds -lt ($MinIdleMinutes * 60)) {
        $problems += ("{0}: saved {1} min ago, below -MinIdleMinutes {2}" -f $label,
            [math]::Floor($State.idleSeconds / 60), $MinIdleMinutes)
    }
    if ($State.players -gt 1 -and -not $AllowMultiplayer) {
        $problems += ("{0}: multiplayer game with {1} seats (use -AllowMultiplayer)" -f $label, $State.players)
    }
    if ($State.phase -match $freshPhasePattern -and -not $AllowFresh) {
        $problems += ("{0}: phase '{1}' is a fresh game (use -AllowFresh)" -f $label, $State.phase)
    }
    return $problems
}

# The backup is a file of INSERT statements written by one sqlite3 process, so it can be
# replayed. Before deleting, it is replayed into a scratch database and the row counts must
# match - an unreplayable backup is a bug, not an annoyance.
function New-Backup {
    param([string[]]$Ids, [string]$Stamp)

    $idList = ConvertTo-SqlIdList -Ids $Ids
    $remotePath = "/tmp/tm-game-cleanup-$Stamp.sql"
    $schemaPath = "/tmp/tm-game-cleanup-$Stamp.schema.sql"
    $scratchPath = "/tmp/tm-game-cleanup-$Stamp.restore.db"
    $countsQuery = "SELECT (SELECT count(*) FROM games WHERE game_id IN ($idList)) || '-' || " +
        "(SELECT count(*) FROM participants WHERE game_id IN ($idList)) || '-' || " +
        "(SELECT count(*) FROM game_results WHERE game_id IN ($idList)) || '-' || " +
        "(SELECT count(*) FROM completed_game WHERE game_id IN ($idList)) || '-' || " +
        "(SELECT count(*) FROM history_archives WHERE game_id IN ($idList));"

    $body = @'
DB="__DB__"
REMOTE="__REMOTE__"
SCHEMA="__SCHEMA__"
SCRATCH="__SCRATCH__"
IDLIST="__IDLIST__"
Q="__COUNTS__"
set -eu
: > "$REMOTE"
for table in games participants game_results completed_game history_archives; do
  sqlite3 -readonly "file:$DB?mode=ro" >> "$REMOTE" <<SQL
.mode insert $table
SELECT * FROM $table WHERE game_id IN ($IDLIST);
SQL
done
if [ "__VERIFY__" = "1" ]; then
  sqlite3 "$DB" ".schema games" ".schema participants" ".schema game_results" \
    ".schema completed_game" ".schema history_archives" > "$SCHEMA"
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
    $body = $body.Replace('__IDLIST__', $idList)
    $body = $body.Replace('__COUNTS__', $countsQuery)
    $body = $body.Replace('__VERIFY__', $(if ($SkipBackupVerify) { '0' } else { '1' }))
    $output = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $body
    $text = (($output | Out-String).Trim())
    if (-not $SkipBackupVerify) {
        Assert-True ($text -match 'backup verified: ') "Backup verification failed: $text"
    }

    if ([string]::IsNullOrWhiteSpace($BackupDir)) {
        $BackupDir = Join-Path (Join-Path $env:TEMP "tm-game-cleanup") $Environment
    }
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    $localPath = Join-Path $BackupDir ("game-cleanup-{0}-{1}.sql" -f $Environment, $Stamp)
    Invoke-TmScpDownload -HostAlias $HostAlias -RemotePath $remotePath -LocalPath $localPath | Out-Null
    return $localPath
}

function Remove-Games {
    param([string[]]$Ids, [string]$BackupPath)

    $idList = ConvertTo-SqlIdList -Ids $Ids
    $body = @'
DB="__DB__"
set -eu
sqlite3 "$DB" <<'SQL'
BEGIN IMMEDIATE;
DELETE FROM history_archives WHERE game_id IN (__IDLIST__);
DELETE FROM game_results WHERE game_id IN (__IDLIST__);
DELETE FROM completed_game WHERE game_id IN (__IDLIST__);
DELETE FROM participants WHERE game_id IN (__IDLIST__);
DELETE FROM games WHERE game_id IN (__IDLIST__);
COMMIT;
SQL
sqlite3 -readonly "file:$DB?mode=ro" "SELECT (SELECT count(*) FROM games WHERE game_id IN (__IDLIST__)) + (SELECT count(*) FROM participants WHERE game_id IN (__IDLIST__)) AS leftovers;"
'@
    $body = $body.Replace('__DB__', (Get-DbPath)).Replace('__IDLIST__', $idList)
    $output = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $body
    $leftovers = (($output | Out-String).Trim() -split "\r?\n" | Select-Object -Last 1)
    Assert-True ($leftovers -eq "0") "Deletion left rows behind (backup: $BackupPath)"
}

Assert-True ($Environment -ne "prod" -or $AllowProd) "Prod deletion needs -AllowProd"

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$result = [ordered]@{
    environment = $Environment
    database = Get-DbPath
    apply = [bool]$Apply
    stamp = $stamp
}

if ($List -or ($GameId.Count -eq 0 -and $MinIdleDays -eq 0)) {
    $running = Get-RunningGames
    $result.mode = "list"
    $result.runningGames = @($running)
    if ($OutputJson) {
        $result | ConvertTo-Json -Depth 6
        return
    }
    Write-Host ("Running games in {0}: {1}" -f $Environment, $running.Count)
    $running | Select-Object gameId, players, phase, generation, saveId,
        @{n = "idleHours"; e = { [math]::Round($_.idleSeconds / 3600, 1) }} |
        Format-Table -AutoSize | Out-String | Write-Host
    return
}

$skipped = @()
if ($MinIdleDays -gt 0) {
    Assert-True (-not $List) "-List and -MinIdleDays select different things; pick one"
    Assert-True ($AllowBulk) "Bulk selection needs -AllowBulk"
    $idleSeconds = $MinIdleDays * 86400
    $candidates = @(Get-RunningGames | Where-Object { $_.idleSeconds -ge $idleSeconds })
    Assert-True ($candidates.Count -gt 0) ("No running game is idle for {0}+ day(s)" -f $MinIdleDays)
    $skippedMultiplayer = @($candidates | Where-Object { $_.players -gt 1 -and -not $AllowMultiplayer })
    $skippedFresh = @($candidates | Where-Object { ($_.players -le 1 -or $AllowMultiplayer) -and ($_.phase -match $freshPhasePattern) -and -not $AllowFresh })
    $skipped = @($skippedMultiplayer + $skippedFresh)
    $pool = @($candidates | Where-Object {
        ($AllowMultiplayer -or $_.players -le 1) -and ($AllowFresh -or $_.phase -notmatch $freshPhasePattern)
    })
    Assert-True ($pool.Count -gt 0) ("Every candidate is a multiplayer or fresh game; nothing to delete" )
    Assert-True ($pool.Count -le $MaxGames) ("{0} games selected, above -MaxGames {1}; raise the cap deliberately" -f $pool.Count, $MaxGames)
    $archived = @(Get-ArchivedIds -Ids @($pool | ForEach-Object { $_.gameId }))
    if ($archived.Count -gt 0) {
        $skipped += @($pool | Where-Object { $archived -contains $_.gameId })
    }
    $selected = @($pool | Where-Object { $archived -notcontains $_.gameId } | ForEach-Object { $_.gameId })
    Assert-True ($selected.Count -gt 0) "Every selected game has a history archive; nothing to delete"
    if ($skipped.Count -gt 0 -and -not $OutputJson) {
        Write-Host ("Skipping {0} game(s): {1} multiplayer, {2} fresh, {3} archived" -f
            $skipped.Count, $skippedMultiplayer.Count, $skippedFresh.Count, $archived.Count)
    }
    $GameId = $selected
}

$states = Get-GameState -Ids $GameId
$missing = @($GameId | Where-Object { $wanted = $_; -not ($states | Where-Object { $_.gameId -eq $wanted -and $_.saves -gt 0 }) })
Assert-True ($missing.Count -eq 0) ("Unknown game id(s): " + ($missing -join ", "))

$refused = @()
foreach ($state in $states) {
    $refused += @(Test-GameDeletable -State $state)
}
Assert-True ($refused.Count -eq 0) ("Refusing to delete:" + [Environment]::NewLine + "  " + ($refused -join ([Environment]::NewLine + "  ")))

$result.mode = if ($Apply) { "delete" } else { "dry-run" }
$result.skipped = @($skipped | ForEach-Object { $_.gameId })
$result.games = @($states)
$backupPath = ""
if ($Apply) {
    $backupPath = New-Backup -Ids $GameId -Stamp $stamp
    $result.backup = $backupPath
    Remove-Games -Ids $GameId -BackupPath $backupPath
    $result.deleted = @($GameId)
}

if ($OutputJson) {
    $result | ConvertTo-Json -Depth 6
    return
}

Write-Host ("{0} game(s) in {1}:" -f $states.Count, $Environment)
$states | Select-Object gameId, players, phase, generation, saves, participants, results, completed, archives,
    @{n = "idleHours"; e = { [math]::Round($_.idleSeconds / 3600, 1) }} |
    Format-Table -AutoSize | Out-String | Write-Host
if ($Apply) {
    Write-Host ("Deleted {0} game(s). Backup: {1}" -f $GameId.Count, $backupPath)
    Write-Host "Restore: sqlite3 game.db < <backup file>"
} else {
    Write-Host "Dry run: nothing was deleted. Re-run with -Apply to delete."
}
