param(
    [string]$HostAlias = "hostkey-codex",
    [switch]$SkipRuntimeSync,
    [switch]$SkipGatewaySync,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$runtimeScript = Join-Path $PSScriptRoot "sync_tm_runtime_services.ps1"
$gatewayScript = Join-Path $PSScriptRoot "sync_tm_public_gateway.ps1"

if (-not $SkipRuntimeSync) {
    $runtimeArgs = @("-File", $runtimeScript, "-VpsHost", $HostAlias, "-EnablePreview")
    if ($DryRun) {
        $runtimeArgs += "-DryRun"
    }
    & pwsh @runtimeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Preview runtime sync failed."
    }
}

if (-not $SkipGatewaySync) {
    $gatewayArgs = @("-File", $gatewayScript, "-VpsHost", $HostAlias, "-EnablePreview")
    if ($DryRun) {
        $gatewayArgs += "-DryRun"
    }
    & pwsh @gatewayArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Preview gateway sync failed."
    }
}
