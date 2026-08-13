param(
    [string]$HostAlias = "hostkey-codex",
    [switch]$PreflightOnly,
    [string]$ReleaseGitSha,
    [string]$StartedAtUtc,
    [string]$FinishedAtUtc
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmSentryRelease.ps1")

$remoteScriptPath = Join-Path $PSScriptRoot "lib\tm_sentry_release_remote.py"
$invokeArgs = @{
    HostAlias = $HostAlias
    RemoteScriptPath = $remoteScriptPath
}
if ($PreflightOnly) {
    $invokeArgs.PreflightOnly = $true
} else {
    $invokeArgs.ReleaseGitSha = $ReleaseGitSha
    $invokeArgs.StartedAtUtc = $StartedAtUtc
    $invokeArgs.FinishedAtUtc = $FinishedAtUtc
}

Invoke-TmSentryRemoteReporter @invokeArgs
