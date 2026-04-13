param(
    [string]$HostAlias = "vps",
    [string]$RemoteRoot = "/home/openclaw/terraforming-mars",
    [string]$ServiceName = "tm-server",
    [string]$OutputPath,
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

function Invoke-SshText {
    param(
        [string]$Command
    )

    $output = & ssh $HostAlias $Command
    if ($LASTEXITCODE -ne 0) {
        throw "SSH command failed: $Command"
    }
    return (($output | Out-String).TrimEnd("`r", "`n"))
}

function Get-HeaderLines {
    param(
        [string]$Path
    )

    return Invoke-SshText "curl -I -s http://127.0.0.1:8081$Path | sed -n '1,20p'"
}

function Join-Lines {
    param(
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return @()
    }
    return @($Text -split "`r?`n")
}

$capturedAtUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$mainPid = Invoke-SshText "systemctl --user show -p MainPID --value $ServiceName"

$cwd = ""
$processInfo = ""
if ($mainPid -match '^\d+$' -and $mainPid -ne "0") {
    $cwd = Invoke-SshText "readlink -f /proc/$mainPid/cwd"
    $processInfo = Invoke-SshText "ps -p $mainPid -o lstart=,cmd="
}

$serviceStatus = Invoke-SshText "systemctl --user status $ServiceName --no-pager | sed -n '1,40p'"
$gitHead = Invoke-SshText "cd $RemoteRoot && git rev-parse HEAD"
$gitStatusText = Invoke-SshText "cd $RemoteRoot && git status --short"
$gitStatusLines = Join-Lines -Text $gitStatusText
$backupDirs = Join-Lines -Text (Invoke-SshText "cd $RemoteRoot && ls -d build.bak-* assets.bak-* 2>/dev/null || true")
$fileMtimes = Invoke-SshText "cd $RemoteRoot && ls -l --time-style=long-iso build/main.js build/vendors.js build/chunks/player-input.js build/chunks/738.js build/src/common/inputs/Payment.js build/src/server/routes/PlayerInput.js build/src/server/server/requestProcessor.js 2>/dev/null"

$headers = [pscustomobject]@{
    mainJs = Get-HeaderLines -Path "/main.js"
    vendorsJs = Get-HeaderLines -Path "/vendors.js"
    playerInputChunk = Get-HeaderLines -Path "/chunks/player-input.js"
}

$result = [pscustomobject]@{
    capturedAtUtc = $capturedAtUtc
    hostAlias = $HostAlias
    remoteRoot = $RemoteRoot
    serviceName = $ServiceName
    service = [pscustomobject]@{
        mainPid = $mainPid
        cwd = $cwd
        process = $processInfo
        status = Join-Lines -Text $serviceStatus
    }
    git = [pscustomobject]@{
        head = $gitHead
        statusCount = $gitStatusLines.Count
        statusLines = $gitStatusLines
    }
    backups = $backupDirs
    fileMtimes = Join-Lines -Text $fileMtimes
    headers = $headers
}

if ($OutputJson) {
    $json = $result | ConvertTo-Json -Depth 8
    if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
        $parent = Split-Path -Parent $OutputPath
        if (-not [string]::IsNullOrWhiteSpace($parent)) {
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
        }
        Set-Content -Path $OutputPath -Value $json
    }
    $json
    exit 0
}

$markdownLines = @(
    "# TM Live State Snapshot"
    ""
    "- CapturedAtUtc: $capturedAtUtc"
    "- HostAlias: $HostAlias"
    "- RemoteRoot: $RemoteRoot"
    "- ServiceName: $ServiceName"
    "- MainPID: $mainPid"
    "- CWD: $cwd"
    "- GitHead: $gitHead"
    "- GitStatusCount: $($gitStatusLines.Count)"
    ""
    "## Service"
    ""
    '```text'
    $serviceStatus
    '```'
    ""
    "## Process"
    ""
    '```text'
    $processInfo
    '```'
    ""
    "## Git Status"
    ""
    '```text'
    $gitStatusText
    '```'
    ""
    "## Backup Directories"
    ""
    '```text'
    ($backupDirs -join "`n")
    '```'
    ""
    "## File Mtimes"
    ""
    '```text'
    $fileMtimes
    '```'
    ""
    "## main.js Headers"
    ""
    '```text'
    ($headers.mainJs -join "`n")
    '```'
    ""
    "## vendors.js Headers"
    ""
    '```text'
    ($headers.vendorsJs -join "`n")
    '```'
    ""
    "## chunks/player-input.js Headers"
    ""
    '```text'
    ($headers.playerInputChunk -join "`n")
    '```'
)

$markdown = $markdownLines -join "`n"

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $parent = Split-Path -Parent $OutputPath
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    Set-Content -Path $OutputPath -Value $markdown
}

$markdown
