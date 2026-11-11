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

    [switch]$Apply,

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

function ConvertTo-SqlIdList {
    param([string[]]$Ids)
    $quoted = foreach ($id in $Ids) {
        Assert-True ($id -match '^g[0-9a-z]+$') "Refusing an id that is not a TM game id: $id"
        "'" + $id + "'"
    }
    return ($quoted -join ",")
}

# Reads rows through the same read-only URI the release gate uses, so listing and
# deletion look at exactly one database.
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

# Mirrors the prod promote gate: one row per running game with its latest save
# and the seconds since that save, so idle time is comparable with the gate.
function Get-RunningGames {
    $sql = @'
SELECT latest.game_id AS gameId, latest.players AS players, latest.save_id AS saveId,
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

function Get-ArchivedIds {
    param([string[]]$Ids)

    $idList = ConvertTo-SqlIdList -Ids $Ids
    $sql = "SELECT DISTINCT game_id AS gameId FROM history_archives WHERE game_id IN (" + $idList + ");"
    return @(Invoke-RemoteJson -Sql $sql | ForEach-Object { $_.gameId })
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
       (SELECT CAST(strftime('%s','now') AS INTEGER) - created_time FROM games
         WHERE game_id = ids.game_id ORDER BY save_id DESC LIMIT 1) AS idleSeconds
FROM ids;
'@
    $sql = $sql.Replace('__IDROWS__', $idRows)
    return @(Invoke-RemoteJson -Sql $sql)
}

# Every affected row is dumped as INSERT statements before anything is deleted,
# so an accidental deletion can be replayed from the local backup file.
function New-Backup {
    param([string[]]$Ids, [string]$Stamp)

    $idList = ConvertTo-SqlIdList -Ids $Ids
    $remotePath = "/tmp/tm-game-cleanup-$Stamp.sql"
    $body = @'
DB="__DB__"
REMOTE="__REMOTE__"
: > "$REMOTE"
for table in games participants game_results completed_game history_archives; do
  {
    echo ".mode insert $table"
    sqlite3 -readonly "file:$DB?mode=ro" "SELECT * FROM $table WHERE game_id IN (__IDLIST__);"
  } >> "$REMOTE"
done
wc -l < "$REMOTE"
'@
    $body = $body.Replace('__DB__', (Get-DbPath)).Replace('__REMOTE__', $remotePath).Replace('__IDLIST__', $idList)
    Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $body | Out-Null

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

if ($MinIdleDays -gt 0) {
    Assert-True (-not $List) "-List and -MinIdleDays select different things; pick one"
    Assert-True ($AllowBulk) "Bulk selection needs -AllowBulk"
    $idleSeconds = $MinIdleDays * 86400
    $candidates = @(Get-RunningGames | Where-Object { $_.idleSeconds -ge $idleSeconds })
    Assert-True ($candidates.Count -gt 0) ("No running game is idle for {0}+ day(s)" -f $MinIdleDays)
    Assert-True ($candidates.Count -le $MaxGames) ("{0} games selected, above -MaxGames {1}; raise the cap deliberately" -f $candidates.Count, $MaxGames)
    $archived = @(Get-ArchivedIds -Ids @($candidates | ForEach-Object { $_.gameId }))
    $selected = @($candidates | Where-Object { $archived -notcontains $_.gameId } | ForEach-Object { $_.gameId })
    $skipped = @($candidates | Where-Object { $archived -contains $_.gameId } | ForEach-Object { $_.gameId })
    Assert-True ($selected.Count -gt 0) "Every selected game has a history archive; nothing to delete"
    if ($skipped.Count -gt 0 -and -not $OutputJson) {
        Write-Host ("Skipping {0} archived game(s): {1}" -f $skipped.Count, ($skipped -join ", "))
    }
    $GameId = $selected
}

Assert-True ($Environment -ne "prod" -or $AllowProd) "Prod deletion needs -AllowProd"

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$result = [ordered]@{
    environment = $Environment
    database = Get-DbPath
    apply = [bool]$Apply
    stamp = $stamp
}

if ($List -or $GameId.Count -eq 0) {
    $running = Get-RunningGames
    $result.mode = "list"
    $result.runningGames = @($running)
    if ($OutputJson) {
        $result | ConvertTo-Json -Depth 6
        return
    }
    Write-Host ("Running games in {0}: {1}" -f $Environment, $running.Count)
    $running | Select-Object gameId, players, saveId,
        @{n = "idleHours"; e = { [math]::Round($_.idleSeconds / 3600, 1) }} |
        Format-Table -AutoSize | Out-String | Write-Host
    return
}

$states = Get-GameState -Ids $GameId
$missing = @($GameId | Where-Object { $wanted = $_; -not ($states | Where-Object { $_.gameId -eq $wanted -and $_.saves -gt 0 }) })
Assert-True ($missing.Count -eq 0) ("Unknown game id(s): " + ($missing -join ", "))

$refused = @()
foreach ($state in $states) {
    $idleMinutes = [math]::Floor($state.idleSeconds / 60)
    if ($state.archives -gt 0) {
        $refused += ("{0}: has {1} history archive(s)" -f $state.gameId, $state.archives)
    } elseif ($idleMinutes -lt $MinIdleMinutes) {
        $refused += ("{0}: saved {1} min ago, below -MinIdleMinutes {2}" -f $state.gameId, $idleMinutes, $MinIdleMinutes)
    }
}
Assert-True ($refused.Count -eq 0) ("Refusing to delete active or archived games:" + [Environment]::NewLine + "  " + ($refused -join ([Environment]::NewLine + "  ")))

$result.mode = if ($Apply) { "delete" } else { "dry-run" }
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
$states | Select-Object gameId, players, saves, participants, results, completed, archives,
    @{n = "idleHours"; e = { [math]::Round($_.idleSeconds / 3600, 1) }} |
    Format-Table -AutoSize | Out-String | Write-Host
if ($Apply) {
    Write-Host ("Deleted {0} game(s). Backup: {1}" -f $GameId.Count, $backupPath)
} else {
    Write-Host "Dry run: nothing was deleted. Re-run with -Apply to delete."
}
