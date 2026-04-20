$ErrorActionPreference = "Stop"

$helperPath = Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1"
. $helperPath

$tempRoot = Join-Path $env:TEMP "tm-remote-tools-tests-$PID"
$savedEnv = @{
    TM_REMOTE_TRANSPORT = $env:TM_REMOTE_TRANSPORT
    TM_NATIVE_SSH_PATH = $env:TM_NATIVE_SSH_PATH
    TM_NATIVE_SCP_PATH = $env:TM_NATIVE_SCP_PATH
    TM_GIT_BASH_PATH = $env:TM_GIT_BASH_PATH
}

function Restore-EnvValue {
    param(
        [string]$Name,
        [AllowNull()]
        [string]$Value
    )

    if ($null -eq $Value) {
        Remove-Item "Env:$Name" -ErrorAction SilentlyContinue
        return
    }

    Set-Item "Env:$Name" $Value
}

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

try {
    $fakeNativeSsh = Join-Path $tempRoot "native-ssh.cmd"
    @'
@echo off
exit /b 255
'@ | Set-Content -LiteralPath $fakeNativeSsh -Encoding ASCII

    $fakeNativeScp = Join-Path $tempRoot "native-scp.cmd"
    @'
@echo off
exit /b 255
'@ | Set-Content -LiteralPath $fakeNativeScp -Encoding ASCII

    $fakeGitBash = Join-Path $tempRoot "git-bash.cmd"
    @'
@echo off
type "%~1"
'@ | Set-Content -LiteralPath $fakeGitBash -Encoding ASCII

    $sourceFile = Join-Path $tempRoot "source file.txt"
    Set-Content -LiteralPath $sourceFile -Value "payload" -Encoding ASCII

    Remove-Item Env:TM_REMOTE_TRANSPORT -ErrorAction SilentlyContinue
    Set-Item Env:TM_NATIVE_SSH_PATH $fakeNativeSsh
    Set-Item Env:TM_NATIVE_SCP_PATH $fakeNativeScp
    Set-Item Env:TM_GIT_BASH_PATH $fakeGitBash

    $transport = Get-TmRemoteTransport -HostAlias "vps"
    if ($transport -ne "gitbash") {
        throw "Expected gitbash fallback, got $transport"
    }

    $scpOutput = Invoke-TmScpUpload -HostAlias "vps" -LocalPath $sourceFile -RemotePath "/tmp/source file.txt"
    $scpText = ($scpOutput | Out-String)
    if ($scpText -notmatch "scp '/.*/source file\.txt' 'vps:/tmp/source file\.txt'") {
        throw "Expected gitbash scp wrapper, got:`n$scpText"
    }

    $sshOutput = Invoke-TmSshScript -HostAlias "vps" -ScriptText "echo ok"
    $sshText = ($sshOutput | Out-String)
    if ($sshText -notmatch "ssh 'vps' 'bash -s' < '") {
        throw "Expected gitbash ssh wrapper, got:`n$sshText"
    }
} finally {
    Restore-EnvValue -Name "TM_REMOTE_TRANSPORT" -Value $savedEnv.TM_REMOTE_TRANSPORT
    Restore-EnvValue -Name "TM_NATIVE_SSH_PATH" -Value $savedEnv.TM_NATIVE_SSH_PATH
    Restore-EnvValue -Name "TM_NATIVE_SCP_PATH" -Value $savedEnv.TM_NATIVE_SCP_PATH
    Restore-EnvValue -Name "TM_GIT_BASH_PATH" -Value $savedEnv.TM_GIT_BASH_PATH
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "tm remote tools regressions: OK"
