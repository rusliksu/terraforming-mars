[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$App,

    [string]$Output = "artifacts/completed-games.jsonl",

    [ValidateSet("json", "jsonl")]
    [string]$Format = "jsonl",

    [Nullable[int]]$Limit = $null,

    [string]$Since,

    [string]$ServerName,

    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

if (-not $SkipBuild) {
    Push-Location $repoRoot
    try {
        npm run build:server
    } finally {
        Pop-Location
    }
}

$rawCredentials = & heroku pg:credentials:url --app $App
$joinedCredentials = ($rawCredentials | Out-String)
$match = [regex]::Match($joinedCredentials, 'postgres(?:ql)?://\S+')
if (-not $match.Success) {
    throw "Could not extract POSTGRES_HOST from 'heroku pg:credentials:url --app $App'."
}

$env:POSTGRES_HOST = $match.Value.Trim()
if ([string]::IsNullOrWhiteSpace($ServerName)) {
    $ServerName = $App
}

$args = @(
    'build/src/server/tools/export_completed_games.js',
    '--output', $Output,
    '--format', $Format,
    '--server-name', $ServerName
)

if ($Limit -ne $null) {
    $args += @('--limit', [string]$Limit)
}
if (-not [string]::IsNullOrWhiteSpace($Since)) {
    $args += @('--since', $Since)
}

Push-Location $repoRoot
try {
    node @args
} finally {
    Pop-Location
}
