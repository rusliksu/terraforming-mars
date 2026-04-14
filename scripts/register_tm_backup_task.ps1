param(
    [string]$TaskName = "TM Runtime Backup",
    [string]$TaskPath = "\",
    [string]$StartTime = "05:15",
    [string]$ArchiveRoot = "D:\tm-vps-archive",
    [int]$KeepNewestBackups = 14,
    [switch]$IncludeDeps,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Quote-TaskArgument {
    param([string]$Value)

    if ($Value -match '[\s"]') {
        return '"' + ($Value -replace '"', '\"') + '"'
    }

    return $Value
}

$runnerScript = Join-Path $PSScriptRoot "run_tm_backup_maintenance.ps1"
if (-not (Test-Path $runnerScript)) {
    throw "Missing runner script: $runnerScript"
}

$startDateTime = [datetime]::ParseExact($StartTime, "HH:mm", [System.Globalization.CultureInfo]::InvariantCulture)
$pwshPath = (Get-Command pwsh -ErrorAction Stop).Source
$userId = if ($env:USERDOMAIN) { "$($env:USERDOMAIN)\$($env:USERNAME)" } else { $env:USERNAME }

$argumentParts = @(
    "-NoProfile"
    "-ExecutionPolicy"
    "Bypass"
    "-File"
    $runnerScript
    "-ArchiveRoot"
    $ArchiveRoot
    "-KeepNewestBackups"
    $KeepNewestBackups.ToString()
)
if ($IncludeDeps) {
    $argumentParts += "-IncludeDeps"
}
$argumentString = ($argumentParts | ForEach-Object { Quote-TaskArgument $_ }) -join ' '

$action = New-ScheduledTaskAction -Execute $pwshPath -Argument $argumentString
$trigger = New-ScheduledTaskTrigger -Daily -At $startDateTime
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

Write-Host "TM backup scheduled task"
Write-Host "TaskName         : $TaskName"
Write-Host "TaskPath         : $TaskPath"
Write-Host "StartTime        : $StartTime"
Write-Host "User             : $userId"
Write-Host "Executable       : $pwshPath"
Write-Host "Arguments        : $argumentString"
Write-Host "ArchiveRoot      : $ArchiveRoot"
Write-Host "KeepNewestBackups: $KeepNewestBackups"
Write-Host "IncludeDeps      : $IncludeDeps"
Write-Host "Mode             : $(if ($DryRun) { 'dry-run' } else { 'register/update task' })"

if ($DryRun) {
    return
}

$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Runs TM runtime shared backup maintenance to D:\tm-vps-archive."
Register-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -InputObject $task -Force | Out-Null

$registered = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath
Write-Host ""
Write-Host "Registered task:"
Write-Host "TaskName : $($registered.TaskName)"
Write-Host "TaskPath : $($registered.TaskPath)"
Write-Host "State    : $($registered.State)"
