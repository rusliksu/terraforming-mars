<#
.SYNOPSIS
Maintains the operator ledger of abandoned TM prod games for the promote gate.

.DESCRIPTION
The prod promote gate blocks while a non-turn-based game was saved within
-RealtimeGameStaleDays. Games the group has abandoned keep blocking until that
window passes, so the operator confirms them once here instead of repeating ids
on every release.

Only a human declares a game abandoned. Nothing infers it: the ledger is a plain
text file that release_tm_prod.ps1 and rollout_tm_server.ps1 merge with the
per-run -IgnoredRealtimeGameId ids, and every merged id is echoed before the
locked remote gate runs.

.EXAMPLE
pwsh -File scripts\tm_ignored_realtime_games.ps1 -List

.EXAMPLE
pwsh -File scripts\tm_ignored_realtime_games.ps1 -Add g1c62f3657ee8 -Note "abandoned 2026-09-08"

.EXAMPLE
pwsh -File scripts\tm_ignored_realtime_games.ps1 -Remove g1c62f3657ee8
#>
param(
    [switch]$List,
    [string[]]$Add,
    [string[]]$Remove,
    [string]$Note,
    [string]$Path,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

$actions = @()
if ($PSBoundParameters.ContainsKey("Add")) {
    $actions += "add"
}
if ($PSBoundParameters.ContainsKey("Remove")) {
    $actions += "remove"
}
if ($List -or $actions.Count -eq 0) {
    $actions += "list"
}
if ($actions.Count -ne 1) {
    throw "Choose exactly one action: -List, -Add, or -Remove."
}

$ledgerPath = Get-TmIgnoredRealtimeGameIdLedgerPath -Path $Path
$entries = @(Read-TmIgnoredRealtimeGameIdLedgerEntries -Path $ledgerPath)

function Write-TmLedgerEntries {
    param(
        [string]$Path,
        [object[]]$Entries
    )

    Write-Host ("Ledger : {0}" -f $Path)
    Write-Host ("Games  : {0}" -f @($Entries).Count)
    foreach ($entry in @($Entries)) {
        if ([string]::IsNullOrWhiteSpace($entry.Note)) {
            Write-Host ("  {0}" -f $entry.GameId)
        } else {
            Write-Host ("  {0}  # {1}" -f $entry.GameId, $entry.Note)
        }
    }
}

$action = $actions[0]
if ($action -eq "list") {
    Write-TmLedgerEntries -Path $ledgerPath -Entries $entries
    exit 0
}

$noteText = ""
if (-not [string]::IsNullOrWhiteSpace($Note)) {
    $noteText = $Note.Trim()
}

$targetEntries = [System.Collections.Generic.List[psobject]]::new()
foreach ($entry in $entries) {
    $targetEntries.Add($entry)
}

if ($action -eq "add") {
    $existing = @($entries | ForEach-Object { $_.GameId })
    foreach ($gameId in @(Assert-TmIgnoredRealtimeGameIds -GameIds $Add)) {
        if ($existing -contains $gameId) {
            Write-Host ("Already listed: {0}" -f $gameId)
            continue
        }
        $targetEntries.Add([pscustomobject]@{GameId = $gameId; Note = $noteText})
        Write-Host ("Added  : {0}" -f $gameId)
    }
} else {
    $removed = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($gameId in @(Assert-TmIgnoredRealtimeGameIds -GameIds $Remove)) {
        [void]$removed.Add($gameId)
    }
    $kept = [System.Collections.Generic.List[psobject]]::new()
    foreach ($entry in $targetEntries) {
        if ($removed.Contains($entry.GameId)) {
            Write-Host ("Removed: {0}" -f $entry.GameId)
            continue
        }
        $kept.Add($entry)
    }
    $targetEntries = $kept
}

if ($DryRun) {
    Write-Host "Dry run: ledger not written."
    Write-TmLedgerEntries -Path $ledgerPath -Entries @($targetEntries)
    exit 0
}

$written = @(Set-TmIgnoredRealtimeGameIdLedger -Path $ledgerPath -Entries @($targetEntries))
Write-Host ("Written: {0} game(s)" -f $written.Count)
Write-TmLedgerEntries -Path $ledgerPath -Entries $written
