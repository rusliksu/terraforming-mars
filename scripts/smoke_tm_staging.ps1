param(
    [string]$Server = "https://staging.tm.knightbyte.win",
    [string]$GameNamePrefix = "StagingSmoke",
    [switch]$IncludeCancelAction,
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"
$cancelActionSmokeScript = Join-Path $PSScriptRoot "smoke_tm_cancel_action.ps1"

if (-not (Test-Path $verifyScript)) {
    throw "Missing verify script: $verifyScript"
}

if ($IncludeCancelAction -and -not (Test-Path $cancelActionSmokeScript)) {
    throw "Missing cancel-action smoke script: $cancelActionSmokeScript"
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

if (-not $IncludeCancelAction) {
    & pwsh @args
    if ($LASTEXITCODE -ne 0) {
        throw "Staging smoke failed."
    }
    exit 0
}

$cancelArgs = @(
    "-File", $cancelActionSmokeScript,
    "-Server", $Server
)

if ($OutputJson) {
    $cancelArgs += "-OutputJson"
    $verifyOutput = & pwsh @args
    if ($LASTEXITCODE -ne 0) {
        throw "Staging smoke failed."
    }

    $cancelOutput = & pwsh @cancelArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Cancel-action staging smoke failed."
    }

    [pscustomobject]@{
        staging = ($verifyOutput -join "`n" | ConvertFrom-Json)
        cancelAction = ($cancelOutput -join "`n" | ConvertFrom-Json)
    } | ConvertTo-Json -Depth 20
    exit 0
}

& pwsh @args
if ($LASTEXITCODE -ne 0) {
    throw "Staging smoke failed."
}

& pwsh @cancelArgs
if ($LASTEXITCODE -ne 0) {
    throw "Cancel-action staging smoke failed."
}
