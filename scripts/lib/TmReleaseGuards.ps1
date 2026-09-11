$ErrorActionPreference = "Stop"

function New-TmReleaseRunToken {
    return "{0}-{1}-{2}" -f (
        (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss"),
        $PID,
        [guid]::NewGuid().ToString("N")
    )
}

function Assert-TmIgnoredRealtimeGameIds {
    param(
        [AllowNull()]
        [string[]]$GameIds
    )

    if ($null -eq $GameIds) {
        return
    }

    $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($value in @($GameIds)) {
        foreach ($candidate in @([string]$value -split ",")) {
            $gameId = $candidate.Trim()
            if ([string]::IsNullOrWhiteSpace($gameId)) {
                throw "IgnoredRealtimeGameId must not contain an empty id."
            }
            if ($gameId.Length -gt 128 -or $gameId -notmatch '^[A-Za-z0-9_-]+$') {
                throw "IgnoredRealtimeGameId must contain only letters, digits, underscores, or hyphens (max 128 characters): '$gameId'"
            }
            if (-not $seen.Add($gameId)) {
                throw "IgnoredRealtimeGameId contains a duplicate id: '$gameId'"
            }
            $gameId
        }
    }
}

function Get-TmIgnoredRealtimeGameIdLedgerDefaultPath {
    # Operator-local ledger beside the deploy snapshots. It is read-only input for the
    # release scripts and is never committed to the repository.
    $scriptsRoot = Split-Path -Parent $PSScriptRoot
    $repoRoot = Split-Path -Parent $scriptsRoot
    $workspaceRoot = Split-Path -Parent $repoRoot
    return Join-Path $workspaceRoot ".tmp\tm-release\prod-ignored-games.txt"
}

function Get-TmIgnoredRealtimeGameIdLedgerPath {
    param(
        [AllowNull()]
        [string]$Path
    )

    if (-not [string]::IsNullOrWhiteSpace($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return Get-TmIgnoredRealtimeGameIdLedgerDefaultPath
}

function Read-TmIgnoredRealtimeGameIdLedgerEntries {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return @()
    }

    $entries = [System.Collections.Generic.List[psobject]]::new()
    $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $lineNumber = 0
    foreach ($rawLine in @(Get-Content -LiteralPath $Path)) {
        $lineNumber++
        $line = [string]$rawLine
        $note = ""
        $commentIndex = $line.IndexOf("#")
        if ($commentIndex -ge 0) {
            $note = $line.Substring($commentIndex + 1).Trim()
            $line = $line.Substring(0, $commentIndex)
        }
        $candidate = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            continue
        }
        if ($candidate -notmatch '^[A-Za-z0-9_-]{1,128}$') {
            throw "Ignored-games ledger line $lineNumber is not a game id: '$($rawLine.Trim())'"
        }
        foreach ($gameId in @(Assert-TmIgnoredRealtimeGameIds -GameIds @($candidate))) {
            if (-not $seen.Add($gameId)) {
                continue
            }
            $entries.Add([pscustomobject]@{GameId = $gameId; Note = $note})
        }
    }

    return $entries.ToArray()
}

function Read-TmIgnoredRealtimeGameIdLedger {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    return @(Read-TmIgnoredRealtimeGameIdLedgerEntries -Path $Path | ForEach-Object { $_.GameId })
}

function Merge-TmIgnoredRealtimeGameIds {
    param(
        [AllowNull()]
        [string[]]$Primary,
        [AllowNull()]
        [string[]]$Additional
    )

    $merged = [System.Collections.Generic.List[string]]::new()
    $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($list in @($Primary, $Additional)) {
        if ($null -eq $list) {
            continue
        }
        foreach ($value in @($list)) {
            $candidate = [string]$value
            if ([string]::IsNullOrWhiteSpace($candidate)) {
                continue
            }
            foreach ($gameId in @(Assert-TmIgnoredRealtimeGameIds -GameIds @($candidate.Trim()))) {
                if ($seen.Add($gameId)) {
                    $merged.Add($gameId)
                }
            }
        }
    }

    return $merged.ToArray()
}

function Set-TmIgnoredRealtimeGameIdLedger {
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [AllowNull()]
        [object[]]$Entries
    )

    $normalized = [System.Collections.Generic.List[psobject]]::new()
    $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($entry in @($Entries)) {
        if ($null -eq $entry) {
            continue
        }
        $gameId = ""
        $note = ""
        if ($entry -is [string]) {
            $gameId = [string]$entry
        } else {
            if ($null -ne $entry.PSObject.Properties["GameId"]) {
                $gameId = [string]$entry.GameId
            }
            if ($null -ne $entry.PSObject.Properties["Note"]) {
                $note = ([string]$entry.Note).Trim()
            }
        }
        if ([string]::IsNullOrWhiteSpace($gameId)) {
            continue
        }
        foreach ($validated in @(Assert-TmIgnoredRealtimeGameIds -GameIds @($gameId.Trim()))) {
            if (-not $seen.Add($validated)) {
                continue
            }
            $normalized.Add([pscustomobject]@{GameId = $validated; Note = $note})
        }
    }

    $directory = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($directory) -and -not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# Games confirmed abandoned by the operator for the TM prod promote gate.")
    $lines.Add("# One <game-id> per line, optional trailing '# note'. Never inferred automatically.")
    foreach ($entry in @($normalized | Sort-Object -Property GameId)) {
        if ([string]::IsNullOrWhiteSpace($entry.Note)) {
            $lines.Add($entry.GameId)
        } else {
            $lines.Add(("{0}  # {1}" -f $entry.GameId, $entry.Note))
        }
    }

    $temporary = "{0}.tmp-{1}" -f $Path, $PID
    Set-Content -LiteralPath $temporary -Value $lines -Encoding utf8
    Move-Item -LiteralPath $temporary -Destination $Path -Force

    return @($normalized | Sort-Object -Property GameId)
}

function Assert-TmStagingSource {
    param(
        [Parameter(Mandatory)]
        [string]$SourceRoot,
        [AllowNull()]
        [string]$HeadSha,
        [AllowNull()]
        [string]$OriginMainSha,
        [AllowNull()]
        [string]$GitStatus,
        [switch]$AllowDirtySource,
        [switch]$AllowPrimaryWorkingTree
    )

    if ($AllowDirtySource) {
        throw "Staging source guard rejects -AllowDirtySource. Staging accepts only a clean checkout at origin/main."
    }
    if ($AllowPrimaryWorkingTree) {
        throw "Staging source guard rejects -AllowPrimaryWorkingTree. Use a clean release checkout at origin/main."
    }
    if (-not [string]::IsNullOrWhiteSpace($GitStatus)) {
        throw "Staging source must be clean: $SourceRoot"
    }
    if ([string]::IsNullOrWhiteSpace($OriginMainSha) -or $OriginMainSha -notmatch '^[0-9a-fA-F]{40}$') {
        throw "Staging source has no valid origin/main SHA. Refresh the clean release checkout before deploy: $SourceRoot"
    }
    if ([string]::IsNullOrWhiteSpace($HeadSha) -or $HeadSha -notmatch '^[0-9a-fA-F]{40}$') {
        throw "Staging source HEAD is not a full git SHA: $SourceRoot"
    }
    if (-not $HeadSha.Equals($OriginMainSha, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Staging source must equal origin/main. source=$SourceRoot head=$HeadSha origin/main=$OriginMainSha"
    }
}

function ConvertTo-TmReleaseCasBaselineBase64 {
    param(
        [Parameter(Mandatory)]
        [psobject]$Snapshot
    )

    if ([int]$Snapshot.schemaVersion -ne 1 -or $null -eq $Snapshot.environments) {
        throw "Release snapshot has an unsupported schema."
    }

    $environments = [ordered]@{}
    foreach ($environmentName in @("prod", "staging")) {
        $state = $Snapshot.environments.$environmentName
        if ($null -eq $state) {
            throw "Release snapshot is missing environment '$environmentName'."
        }
        $manifest = $state.manifest
        $gitSha = if ($null -eq $manifest) { "" } else { [string]$manifest.gitSha }
        $artifactSha = if ($null -eq $manifest) { "" } else { [string]$manifest.artifactSha256 }
        if (-not [string]::IsNullOrWhiteSpace($gitSha) -and $gitSha -notmatch '^[0-9a-fA-F]{40}$') {
            throw "Release snapshot $environmentName gitSha is malformed."
        }
        if (-not [string]::IsNullOrWhiteSpace($artifactSha) -and $artifactSha -notmatch '^[0-9a-fA-F]{64}$') {
            throw "Release snapshot $environmentName artifactSha256 is malformed."
        }
        $environments[$environmentName] = [ordered]@{
            currentTarget = [string]$state.currentTarget
            gitSha = $gitSha.ToLowerInvariant()
            artifactSha256 = $artifactSha.ToLowerInvariant()
        }
    }

    $baseline = [ordered]@{
        schema = "TmReleaseCasBaselineV1"
        environments = $environments
    }
    $json = $baseline | ConvertTo-Json -Depth 6 -Compress
    return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
}

function Assert-TmReleaseCasBaselineBase64 {
    param(
        [AllowNull()]
        [string]$Token
    )

    if ([string]::IsNullOrWhiteSpace($Token)) {
        return
    }
    if ($Token -notmatch '^[A-Za-z0-9+/]+={0,2}$') {
        throw "ExpectedReleaseBaselineBase64 is not valid base64."
    }
    try {
        $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Token))
        $baseline = $json | ConvertFrom-Json -Depth 8
    } catch {
        throw "ExpectedReleaseBaselineBase64 could not be decoded."
    }
    if ($baseline.schema -ne "TmReleaseCasBaselineV1") {
        throw "ExpectedReleaseBaselineBase64 has an unsupported schema."
    }
    foreach ($environmentName in @("prod", "staging")) {
        $state = $baseline.environments.$environmentName
        if ($null -eq $state) {
            throw "ExpectedReleaseBaselineBase64 is missing '$environmentName'."
        }
        if ([string]$state.gitSha -notmatch '^(|[0-9a-f]{40})$' -or
            [string]$state.artifactSha256 -notmatch '^(|[0-9a-f]{64})$') {
            throw "ExpectedReleaseBaselineBase64 contains malformed manifest pins for '$environmentName'."
        }
    }
}
