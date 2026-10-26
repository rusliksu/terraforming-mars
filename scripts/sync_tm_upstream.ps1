[CmdletBinding()]
param(
    [ValidateSet("Prepare", "Continue")]
    [string]$Mode = "Prepare",
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$OriginRemote = "origin",
    [string]$CanonicalBranch = "main",
    [string]$UpstreamRemote = "upstream",
    [string]$UpstreamBranch = "main",
    [string]$CandidateBranch,
    [string]$ReportRoot = (Join-Path (Split-Path -Parent (Resolve-Path (Join-Path $PSScriptRoot "..")).Path) ".tmp\upstream-sync"),
    [string]$AdoptionLedgerPath = (Join-Path $PSScriptRoot "upstream-sync\adoptions.json"),
    [string[]]$ValidationCommands,
    [switch]$NoAdoptionRemoteLookup,
    [switch]$NoFetch,
    [switch]$PushCandidate
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\TmUpstreamSync.ps1")

$invokeParameters = @{
    RepositoryRoot = $RepositoryRoot
    Mode = $Mode
    OriginRemote = $OriginRemote
    CanonicalBranch = $CanonicalBranch
    UpstreamRemote = $UpstreamRemote
    UpstreamBranch = $UpstreamBranch
    ReportRoot = $ReportRoot
    AdoptionLedgerPath = $AdoptionLedgerPath
    NoFetch = $NoFetch
    PushCandidate = $PushCandidate
    NoAdoptionRemoteLookup = $NoAdoptionRemoteLookup
}
if (-not [string]::IsNullOrWhiteSpace($CandidateBranch)) {
    $invokeParameters.CandidateBranch = $CandidateBranch
}
if ($PSBoundParameters.ContainsKey("ValidationCommands")) {
    $invokeParameters.ValidationCommands = $ValidationCommands
}

$report = Invoke-TmUpstreamSync @invokeParameters
Write-Host ("TM upstream sync: {0} (exit {1})" -f $report.status, $report.exitCode)
if ($null -ne $report.candidate) {
    Write-Host ("Candidate: {0} {1}" -f $report.candidate.branch, $report.candidate.sha)
}
Write-Host ("JSON report: {0}" -f $report.reportPaths.json)
Write-Host ("Markdown report: {0}" -f $report.reportPaths.markdown)
exit [int]$report.exitCode
