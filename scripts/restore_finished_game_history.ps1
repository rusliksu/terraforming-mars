<#
.SYNOPSIS
    Restore the compacted intermediate saves of finished games from a full database snapshot.

.DESCRIPTION
    scripts\compact_finished_games.ps1 keeps only the final save of old finished games and
    writes the removed rows into a per-run SQL backup. When that backup is gone, a full
    SQLite snapshot (for example <env>/backups/<stamp>-game.db.gz) still holds the original
    rows. This script extracts the snapshot once, then copies back the missing rows
    (save_id < final save) for the requested games.

    Every game is validated before any write: it must exist in the snapshot, be a finished
    game with a completion record, currently keep only its final save, and its final save id
    must match the snapshot. That keeps the restored history continuous. Dry run by default;
    -Apply writes rows in one transaction per game and re-verifies the row count. The
    extracted snapshot is removed unless -KeepExtracted is used.

    One-command restore:
      pwsh -File scripts\restore_finished_game_history.ps1 -Environment prod -AllowProd -Games g7090eaedaca0,gd87731e02310 -Apply

    Prod requires -AllowProd. A custom -DatabasePath needs -AllowCustomDatabase (maintenance
    and tests only).
#>
param(
    [ValidateSet("staging", "prod")]
    [string]$Environment = "staging",

    [switch]$AllowProd,

    # Game ids to restore, for example -Games g7090eaedaca0,gd87731e02310
    [string[]]$Games = @(),

    # Remote .gz snapshot; defaults to the newest *-game.db.gz in <env>/backups.
    [string]$Snapshot = "",

    [switch]$Apply,

    # Keep the extracted snapshot database on the VPS after the run.
    [switch]$KeepExtracted,

    # Refuse a game that needs more rows than this in one run.
    [int]$MaxRows = 5000,

    # Minimum free space (GiB) on the VPS temp filesystem for the extracted snapshot.
    [int]$MinFreeGb = 24,

    # Override the database file (maintenance and tests only; needs -AllowCustomDatabase).
    [string]$DatabasePath = "",

    [switch]$AllowCustomDatabase,

    [string]$HostAlias = "hostkey-codex",

    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

# -File passes "-Games a,b" as one argument, so split comma/space separated ids here.
$Games = @($Games | ForEach-Object { $_ -split '[, ]+' } | ForEach-Object { $_.Trim() } |
    Where-Object { $_ -ne '' } | Select-Object -Unique)

Assert-True ($Environment -ne "prod" -or $AllowProd) "Prod restore needs -AllowProd"
Assert-True ($Games.Count -gt 0) "Give at least one game id with -Games"
foreach ($id in $Games) {
    Assert-True ($id -match '^g[0-9a-z]{1,32}$') "Refusing an id that is not a TM game id: $id"
}
if (-not [string]::IsNullOrWhiteSpace($DatabasePath)) {
    Assert-True ($AllowCustomDatabase) "A custom -DatabasePath needs -AllowCustomDatabase"
}

$root = "/home/openclaw/tm-runtime/$Environment"
$dbPath = if ([string]::IsNullOrWhiteSpace($DatabasePath)) { "$root/shared/db/game.db" } else { $DatabasePath }
$gameList = $Games -join ","

$body = @'
set -eu
ROOT="__ROOT__"
DB="__DB__"
SNAP_GZ="__SNAPGZ__"
APPLY="__APPLY__"
KEEP="__KEEP__"
MAXROWS="__MAXROWS__"
MINFREE="__MINFREE__"
GAMES="__GAMES__"
TMPBASE="/tmp/tm-restore-history"

if [ -z "$SNAP_GZ" ]; then
  SNAP_GZ=$(ls -t "$ROOT/backups"/*-game.db.gz 2>/dev/null | head -1 || true)
fi
if [ -z "$SNAP_GZ" ] || [ ! -f "$SNAP_GZ" ]; then
  echo "ERROR|_|snapshot_not_found|$SNAP_GZ"
  exit 2
fi

free_gb=$(( $(df -Pk /tmp | tail -1 | awk '{print $4}') / 1024 / 1024 ))
if [ "$free_gb" -lt "$MINFREE" ]; then
  echo "ERROR|_|not_enough_space|$free_gb"
  exit 3
fi

mkdir -p "$TMPBASE"
SNAP="$TMPBASE/$(basename "$SNAP_GZ" .gz)"
if [ ! -f "$SNAP" ] || [ "$SNAP_GZ" -nt "$SNAP" ]; then
  echo "INFO|_|extracting|$SNAP_GZ"
  rm -f "$SNAP.part"
  gzip -dc "$SNAP_GZ" > "$SNAP.part"
  mv "$SNAP.part" "$SNAP"
fi
if ! sqlite3 -readonly "file:$SNAP?mode=ro" "SELECT count(*) FROM games;" > /dev/null 2>&1; then
  echo "ERROR|_|snapshot_open_failed|$SNAP"
  exit 4
fi

IFS=',' read -r -a GAME_ARR <<< "$GAMES"
unset IFS
for g in "${GAME_ARR[@]}"; do
  stats=$(sqlite3 -readonly "file:$DB?mode=ro" "ATTACH DATABASE 'file:$SNAP?mode=ro' AS snap; SELECT (SELECT count(*) FROM main.games WHERE game_id='$g'), (SELECT coalesce(max(save_id),-1) FROM main.games WHERE game_id='$g'), (SELECT count(*) FROM snap.games WHERE game_id='$g'), (SELECT coalesce(max(save_id),-1) FROM snap.games WHERE game_id='$g'), (SELECT count(*) FROM main.completed_game WHERE game_id='$g');" || true)
  if [ -z "$stats" ]; then
    echo "ERROR|$g|stats_failed|0"
    continue
  fi
  IFS='|' read -r local_rows local_max snap_rows snap_max completed <<< "$stats"
  unset IFS
  if [ "$local_rows" = "0" ]; then
    echo "ERROR|$g|not_found|0"
    continue
  fi
  if [ "$local_rows" -gt 1 ]; then
    echo "ERROR|$g|has_history|$local_rows"
    continue
  fi
  if [ "$snap_rows" = "0" ]; then
    echo "ERROR|$g|not_in_snapshot|0"
    continue
  fi
  if [ "$snap_max" != "$local_max" ]; then
    echo "ERROR|$g|final_mismatch|local=$local_max snapshot=$snap_max"
    continue
  fi
  if [ "$completed" = "0" ]; then
    echo "ERROR|$g|not_completed|0"
    continue
  fi
  restore=$(( snap_rows - 1 ))
  if [ "$restore" -gt "$MAXROWS" ]; then
    echo "ERROR|$g|too_many_rows|$restore"
    continue
  fi
  if [ "$APPLY" != "1" ]; then
    echo "READY|$g|dry_run|$restore|$local_max"
    continue
  fi
  before=$local_rows
  sqlite3 "$DB" <<SQL
.timeout 5000
ATTACH DATABASE 'file:$SNAP?mode=ro' AS snap;
BEGIN IMMEDIATE;
INSERT OR IGNORE INTO main.games SELECT * FROM snap.games WHERE game_id='$g' AND save_id < (SELECT max(save_id) FROM main.games WHERE game_id='$g');
COMMIT;
SQL
  after=$(sqlite3 -readonly "file:$DB?mode=ro" "SELECT count(*) FROM games WHERE game_id='$g';")
  if [ "$after" != "$(( before + restore ))" ]; then
    echo "ERROR|$g|verify_failed|rows=$after"
    continue
  fi
  echo "RESTORED|$g|applied|$restore|$local_max"
done

if [ "$KEEP" != "1" ]; then
  rm -f "$SNAP"
fi
echo "DONE|_|_|0|0"
'@

$body = $body.Replace('__ROOT__', $root)
$body = $body.Replace('__DB__', $dbPath)
$body = $body.Replace('__SNAPGZ__', $Snapshot)
$body = $body.Replace('__GAMES__', $gameList)
$body = $body.Replace('__APPLY__', $(if ($Apply) { '1' } else { '0' }))
$body = $body.Replace('__KEEP__', $(if ($KeepExtracted) { '1' } else { '0' }))
$body = $body.Replace('__MAXROWS__', $MaxRows)
$body = $body.Replace('__MINFREE__', $MinFreeGb)

$output = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $body
$lines = @($output | Out-String) -split "\r?\n" | Where-Object { $_.Trim() -ne '' }

$records = @()
$errors = @()
foreach ($line in $lines) {
    $parts = $line -split '\|'
    switch ($parts[0]) {
        'READY' { $records += [ordered]@{ game = $parts[1]; status = 'dry_run'; rows = [int]$parts[3]; finalSave = $parts[4] } }
        'RESTORED' { $records += [ordered]@{ game = $parts[1]; status = 'restored'; rows = [int]$parts[3]; finalSave = $parts[4] } }
        'ERROR' { $errors += [ordered]@{ game = $parts[1]; status = 'error'; reason = $parts[2]; detail = $parts[3] } }
    }
}

$result = [ordered]@{
    environment = $Environment
    database = $dbPath
    apply = [bool]$Apply
    games = $records
    errors = $errors
    totalRows = [int64](($records | ForEach-Object { [int64]$_.rows } | Measure-Object -Sum).Sum)
}

if ($OutputJson) {
    $result | ConvertTo-Json -Depth 6
    return
}

foreach ($record in $records) {
    Write-Host ("{0}: {1}, rows {2}, final save {3}" -f $record.game, $record.status, $record.rows, $record.finalSave)
}
foreach ($errorRecord in $errors) {
    Write-Host ("{0}: ERROR {1} ({2})" -f $errorRecord.game, $errorRecord.reason, $errorRecord.detail)
}
$verb = if ($Apply) { 'restored' } else { 'would restore' }
Write-Host ("{0} {1} row(s) for {2} game(s)" -f $verb, $result.totalRows, $records.Count)
if (-not $Apply) { Write-Host "Dry run: nothing was written. Re-run with -Apply to restore." }
if ($errors.Count -gt 0) { exit 1 }