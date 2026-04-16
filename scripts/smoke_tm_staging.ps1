param(
    [string]$Server = "https://staging.tm.knightbyte.win",
    [string]$GameNamePrefix = "StagingSmoke",
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"

if (-not (Test-Path $verifyScript)) {
    throw "Missing verify script: $verifyScript"
}

$args = @(
    "-File", $verifyScript,
    "-Server", $Server,
    "-Environment", "staging",
    "-RequireReleaseManifest",
    "-CreateGame",
    "-GameNamePrefix", $GameNamePrefix
)

if ($OutputJson) {
    $args += "-OutputJson"
}

& pwsh @args
if ($LASTEXITCODE -ne 0) {
    throw "Staging smoke failed."
}
