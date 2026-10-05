$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/TmRemoteTools.ps1")
. (Join-Path $PSScriptRoot "lib/TmDurableRemoteJob.ps1")

# SSH is the only mocked boundary; the production observer and error contract run.
$script:remoteStatus = '{"state":"completed","exitCode":0}'
$script:logReads = 0
function Invoke-TmSshScript {
    param([string]$HostAlias, [string]$ScriptText)
    if ($script:remoteStatus -eq 'disconnected') { throw 'fixture SSH disconnected' }
    return $script:remoteStatus
}
function Invoke-TmSshCommand {
    param([string]$HostAlias, [string]$RemoteCommand)
    if ($RemoteCommand -ne "cat -- '/fixture/job/job.log'") { throw "Unexpected remote mutation: $RemoteCommand" }
    $script:logReads++
    return 'fixture promotion log'
}
function Assert-ObserverThrows {
    param([string]$ExpectedMessage)
    try {
        Wait-TmDurableRemoteJob -HostAlias fixture -JobDirectory /fixture/job -TimeoutSeconds 1
    } catch {
        if ($_.Exception.Message -notlike "*$ExpectedMessage*") { throw }
        return
    }
    throw "Observer did not fail for: $ExpectedMessage"
}

$result = Wait-TmDurableRemoteJob -HostAlias fixture -JobDirectory /fixture/job
if ($result -ne 'fixture promotion log' -or $script:logReads -ne 1) { throw 'Successful result/log was lost.' }
$script:remoteStatus = '{"state":"completed","exitCode":23}'
Assert-ObserverThrows 'exit code 23'
if ($script:logReads -ne 2) { throw 'Failed promotion log was not read.' }
$script:remoteStatus = '{"state":"unknown"}'
Assert-ObserverThrows 'status is unknown'
$script:remoteStatus = 'disconnected'
Assert-ObserverThrows 'fixture SSH disconnected'
$script:remoteStatus = '{"state":"running"}'
Assert-ObserverThrows 'NOT cancelled'
if ($script:logReads -ne 2) { throw 'Incomplete operation was read as completed.' }
Write-Host 'Durable job observer regressions: OK'
