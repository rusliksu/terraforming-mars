$ErrorActionPreference = "Stop"

$scriptsRoot = $PSScriptRoot
$excludePaths = @(
    (Join-Path $scriptsRoot "lib\TmRemoteTools.ps1"),
    (Join-Path $scriptsRoot "open_tm_staging_tunnel.ps1"),
    (Join-Path $scriptsRoot "test_tm_remote_tools.ps1"),
    (Join-Path $scriptsRoot "test_tm_remote_scripts_transport.ps1")
)
$forbiddenPatterns = @(
    'scp\.exe',
    'ssh\.exe',
    '&\s*scp\b',
    '&\s*ssh\b'
)

$violations = @()

Get-ChildItem -LiteralPath $scriptsRoot -Filter *.ps1 -Recurse | ForEach-Object {
    if ($excludePaths -contains $_.FullName) {
        return
    }

    $content = Get-Content -LiteralPath $_.FullName
    for ($index = 0; $index -lt $content.Count; $index++) {
        $line = $content[$index]
        foreach ($pattern in $forbiddenPatterns) {
            if ($line -match $pattern) {
                $violations += "{0}:{1}: {2}" -f $_.FullName, ($index + 1), $line.Trim()
            }
        }
    }
}

if ($violations.Count -gt 0) {
    throw "Found direct ssh/scp usage outside TmRemoteTools:`n$($violations -join "`n")"
}

Write-Host "tm remote script transport guard: OK"
