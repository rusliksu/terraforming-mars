Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "TmRemoteTools.ps1")

function Get-TmStagingReleaseGitSha {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Snapshot,
        [string]$ExpectedGitSha
    )

    $manifest = $Snapshot.environments.staging.manifest
    if ($null -eq $manifest) {
        throw "Staging post-deploy snapshot does not contain a release manifest."
    }

    $gitSha = [string]$manifest.gitSha
    if ($gitSha -notmatch '^[0-9a-fA-F]{40}$') {
        throw "Staging release manifest must contain a full 40-character git SHA."
    }
    if ([string]$manifest.environment -ne "staging") {
        throw "Staging release manifest has an incompatible environment."
    }
    if ($manifest.sourceTreeClean -isnot [bool] -or -not $manifest.sourceTreeClean) {
        throw "Staging release manifest must prove a clean source tree."
    }

    if (-not [string]::IsNullOrWhiteSpace($ExpectedGitSha)) {
        if ($ExpectedGitSha -notmatch '^[0-9a-fA-F]{40}$') {
            throw "ExpectedGitSha must be a full 40-character git SHA."
        }
        if (-not $gitSha.Equals($ExpectedGitSha, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Staging release manifest SHA does not match ExpectedGitSha."
        }
    }

    return $gitSha.ToLowerInvariant()
}

function ConvertTo-TmSentryUtcTimestamp {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $parsed = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse(
        $Value,
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::AssumeUniversal,
        [ref]$parsed)) {
        throw "$Name must be an ISO-8601 timestamp."
    }
    return $parsed.ToUniversalTime().ToString("o", [Globalization.CultureInfo]::InvariantCulture)
}

function Invoke-TmSentryRemoteReporter {
    param(
        [Parameter(Mandatory = $true)]
        [string]$HostAlias,
        [Parameter(Mandatory = $true)]
        [string]$RemoteScriptPath,
        [switch]$PreflightOnly,
        [string]$ReleaseGitSha,
        [string]$StartedAtUtc,
        [string]$FinishedAtUtc
    )

    if ($HostAlias -notmatch '^[A-Za-z0-9._-]+$') {
        throw "HostAlias contains unsupported characters."
    }
    if (-not (Test-Path -LiteralPath $RemoteScriptPath -PathType Leaf)) {
        throw "Missing Sentry remote reporter: $RemoteScriptPath"
    }

    $remoteArguments = "--preflight-only"
    if (-not $PreflightOnly) {
        if ($ReleaseGitSha -notmatch '^[0-9a-f]{40}$') {
            throw "ReleaseGitSha must be a lowercase full 40-character git SHA."
        }
        $started = ConvertTo-TmSentryUtcTimestamp -Value $StartedAtUtc -Name "StartedAtUtc"
        $finished = ConvertTo-TmSentryUtcTimestamp -Value $FinishedAtUtc -Name "FinishedAtUtc"
        if ([DateTimeOffset]::Parse($finished) -lt [DateTimeOffset]::Parse($started)) {
            throw "FinishedAtUtc cannot be earlier than StartedAtUtc."
        }
        if ($started -notmatch '^[0-9T:.+Z-]+$' -or $finished -notmatch '^[0-9T:.+Z-]+$') {
            throw "Normalized deploy timestamps contain unsupported characters."
        }
        $remoteArguments = "--release $ReleaseGitSha --started-at $started --finished-at $finished"
    }

    $python = (Get-Content -Raw -LiteralPath $RemoteScriptPath) -replace "`r`n", "`n"
    if ($python.Contains("`nTM_SENTRY_PYTHON`n")) {
        throw "Sentry remote reporter contains the reserved heredoc marker."
    }
    $scriptText = @(
        "set -euo pipefail"
        "python3 - $remoteArguments <<'TM_SENTRY_PYTHON'"
        $python.TrimEnd("`n")
        "TM_SENTRY_PYTHON"
    ) -join "`n"

    return Invoke-TmSshScript -HostAlias $HostAlias -ScriptText $scriptText
}
