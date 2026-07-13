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
