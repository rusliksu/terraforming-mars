$ErrorActionPreference = "Stop"

$script:TmRemoteTransportCache = @{}

function Test-TmRemoteToolsIsWindows {
    if (Get-Variable -Name IsWindows -Scope Global -ErrorAction SilentlyContinue) {
        return [bool]$global:IsWindows
    }

    return $env:OS -eq "Windows_NT"
}

function Get-TmRemoteToolPath {
    param(
        [string]$EnvVarName,
        [string]$DefaultCommand
    )

    $override = [Environment]::GetEnvironmentVariable($EnvVarName)
    if (-not [string]::IsNullOrWhiteSpace($override)) {
        $resolvedOverride = Resolve-Path -LiteralPath $override -ErrorAction SilentlyContinue
        if ($null -eq $resolvedOverride) {
            throw "Configured path from $EnvVarName does not exist: $override"
        }
        return $resolvedOverride.Path
    }

    $command = Get-Command $DefaultCommand -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $command) {
        return $null
    }

    return $command.Source
}

function Get-TmGitBashPath {
    $override = [Environment]::GetEnvironmentVariable("TM_GIT_BASH_PATH")
    if (-not [string]::IsNullOrWhiteSpace($override)) {
        $resolvedOverride = Resolve-Path -LiteralPath $override -ErrorAction SilentlyContinue
        if ($null -eq $resolvedOverride) {
            throw "Configured path from TM_GIT_BASH_PATH does not exist: $override"
        }
        return $resolvedOverride.Path
    }

    $candidates = @(
        "C:\Program Files\Git\bin\bash.exe",
        "C:\Program Files\Git\usr\bin\bash.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    $command = Get-Command bash.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $command) {
        return $null
    }

    if ($command.Source -notmatch "[\\/]Git[\\/]") {
        return $null
    }

    return $command.Source
}

function Get-TmNativeSshPath {
    return Get-TmRemoteToolPath -EnvVarName "TM_NATIVE_SSH_PATH" -DefaultCommand "ssh.exe"
}

function Get-TmNativeScpPath {
    return Get-TmRemoteToolPath -EnvVarName "TM_NATIVE_SCP_PATH" -DefaultCommand "scp.exe"
}

function ConvertTo-TmBashSingleQuotedValue {
    param(
        [AllowNull()]
        [string]$Value
    )

    if ($null -eq $Value) {
        return "''"
    }

    return "'" + $Value.Replace("'", "'`"`'`"`'") + "'"
}

function ConvertTo-TmGitBashPath {
    param(
        [string]$PathValue
    )

    $fullPath = [System.IO.Path]::GetFullPath($PathValue)
    $match = [regex]::Match($fullPath, "^(?<drive>[A-Za-z]):\\(?<rest>.*)$")
    if ($match.Success) {
        $drive = $match.Groups["drive"].Value.ToLowerInvariant()
        $rest = $match.Groups["rest"].Value -replace "\\", "/"
        if ([string]::IsNullOrEmpty($rest)) {
            return "/$drive"
        }
        return "/$drive/$rest"
    }

    return $fullPath -replace "\\", "/"
}

function Invoke-TmProcessProbe {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList
    )

    $stdoutPath = Join-Path $env:TEMP ("tm-remote-probe-out-{0}.txt" -f ([guid]::NewGuid().ToString("N")))
    $stderrPath = Join-Path $env:TEMP ("tm-remote-probe-err-{0}.txt" -f ([guid]::NewGuid().ToString("N")))

    try {
        $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -NoNewWindow -PassThru -Wait -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }
        $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }
        return [pscustomobject]@{
            ExitCode = $process.ExitCode
            StdOut = $stdout
            StdErr = $stderr
        }
    } finally {
        Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    }
}

function Test-TmNativeSshConnection {
    param(
        [string]$ExecutablePath,
        [string]$HostAlias
    )

    if ([string]::IsNullOrWhiteSpace($ExecutablePath)) {
        return $false
    }

    try {
        $probe = Invoke-TmProcessProbe -FilePath $ExecutablePath -ArgumentList @(
            "-o", "BatchMode=yes",
            "-o", "ConnectTimeout=5",
            $HostAlias,
            "echo tm-ssh-probe"
        )
        return $probe.ExitCode -eq 0 -and $probe.StdOut.Trim() -eq "tm-ssh-probe"
    } catch {
        return $false
    }
}

function Get-TmRemoteTransport {
    param(
        [string]$HostAlias
    )

    $override = [Environment]::GetEnvironmentVariable("TM_REMOTE_TRANSPORT")
    if (-not [string]::IsNullOrWhiteSpace($override)) {
        $normalizedOverride = $override.Trim().ToLowerInvariant()
        if ($normalizedOverride -notin @("native", "gitbash")) {
            throw "Unsupported TM_REMOTE_TRANSPORT value: $override"
        }
        return $normalizedOverride
    }

    if ($script:TmRemoteTransportCache.ContainsKey($HostAlias)) {
        return $script:TmRemoteTransportCache[$HostAlias]
    }

    $transport = "native"
    if (Test-TmRemoteToolsIsWindows) {
        $gitBashPath = Get-TmGitBashPath
        $nativeSshPath = Get-TmNativeSshPath
        $nativeScpPath = Get-TmNativeScpPath

        if (-not [string]::IsNullOrWhiteSpace($gitBashPath)) {
            if ([string]::IsNullOrWhiteSpace($nativeSshPath) -or [string]::IsNullOrWhiteSpace($nativeScpPath)) {
                $transport = "gitbash"
            } elseif (-not (Test-TmNativeSshConnection -ExecutablePath $nativeSshPath -HostAlias $HostAlias)) {
                $transport = "gitbash"
            }
        }
    }

    $script:TmRemoteTransportCache[$HostAlias] = $transport
    return $transport
}

function Invoke-TmGitBashWrapper {
    param(
        [string]$ScriptBody
    )

    $bashPath = Get-TmGitBashPath
    if ([string]::IsNullOrWhiteSpace($bashPath)) {
        throw "Git Bash was selected for remote transport, but bash.exe was not found."
    }

    $wrapperPath = Join-Path $env:TEMP ("tm-remote-wrapper-{0}.sh" -f ([guid]::NewGuid().ToString("N")))
    try {
        Set-Content -LiteralPath $wrapperPath -Value $ScriptBody -Encoding ASCII
        return (& $bashPath $wrapperPath)
    } finally {
        Remove-Item -LiteralPath $wrapperPath -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-TmSshCommand {
    param(
        [string]$HostAlias,
        [string]$RemoteCommand
    )

    $transport = Get-TmRemoteTransport -HostAlias $HostAlias
    if ($transport -eq "native") {
        $sshPath = Get-TmNativeSshPath
        if ([string]::IsNullOrWhiteSpace($sshPath)) {
            throw "ssh.exe was not found."
        }
        return (& $sshPath $HostAlias $RemoteCommand)
    }

    $scriptBody = @(
        "set -euo pipefail"
        ("ssh {0} {1}" -f (ConvertTo-TmBashSingleQuotedValue $HostAlias), (ConvertTo-TmBashSingleQuotedValue $RemoteCommand))
    ) -join "`n"
    return Invoke-TmGitBashWrapper -ScriptBody $scriptBody
}

function Invoke-TmSshScript {
    param(
        [string]$HostAlias,
        [string]$ScriptText
    )

    $normalizedScriptText = ($ScriptText -replace "`r`n", "`n")
    $transport = Get-TmRemoteTransport -HostAlias $HostAlias
    if ($transport -eq "native") {
        $sshPath = Get-TmNativeSshPath
        if ([string]::IsNullOrWhiteSpace($sshPath)) {
            throw "ssh.exe was not found."
        }
        return ($normalizedScriptText | & $sshPath $HostAlias "bash -s")
    }

    $inputPath = Join-Path $env:TEMP ("tm-remote-stdin-{0}.sh" -f ([guid]::NewGuid().ToString("N")))
    try {
        Set-Content -LiteralPath $inputPath -Value $normalizedScriptText -Encoding ASCII
        $gitInputPath = ConvertTo-TmGitBashPath -PathValue $inputPath
        $scriptBody = @(
            "set -euo pipefail"
            ("ssh {0} 'bash -s' < {1}" -f (ConvertTo-TmBashSingleQuotedValue $HostAlias), (ConvertTo-TmBashSingleQuotedValue $gitInputPath))
        ) -join "`n"
        return Invoke-TmGitBashWrapper -ScriptBody $scriptBody
    } finally {
        Remove-Item -LiteralPath $inputPath -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-TmScpUpload {
    param(
        [string]$HostAlias,
        [string]$LocalPath,
        [string]$RemotePath,
        [switch]$Recursive
    )

    $transport = Get-TmRemoteTransport -HostAlias $HostAlias
    $remoteSpec = "{0}:{1}" -f $HostAlias, $RemotePath

    if ($transport -eq "native") {
        $scpPath = Get-TmNativeScpPath
        if ([string]::IsNullOrWhiteSpace($scpPath)) {
            throw "scp.exe was not found."
        }

        $arguments = @()
        if ($Recursive) {
            $arguments += "-r"
        }
        $arguments += @($LocalPath, $remoteSpec)
        return (& $scpPath @arguments)
    }

    $gitLocalPath = ConvertTo-TmGitBashPath -PathValue $LocalPath
    $commandParts = @("scp")
    if ($Recursive) {
        $commandParts += "-r"
    }
    $commandParts += @(
        (ConvertTo-TmBashSingleQuotedValue $gitLocalPath),
        (ConvertTo-TmBashSingleQuotedValue $remoteSpec)
    )
    $scriptBody = @(
        "set -euo pipefail"
        ($commandParts -join " ")
    ) -join "`n"
    return Invoke-TmGitBashWrapper -ScriptBody $scriptBody
}

function Invoke-TmScpDownload {
    param(
        [string]$HostAlias,
        [string]$RemotePath,
        [string]$LocalPath,
        [switch]$Recursive
    )

    $transport = Get-TmRemoteTransport -HostAlias $HostAlias
    $remoteSpec = "{0}:{1}" -f $HostAlias, $RemotePath

    if ($transport -eq "native") {
        $scpPath = Get-TmNativeScpPath
        if ([string]::IsNullOrWhiteSpace($scpPath)) {
            throw "scp.exe was not found."
        }

        $arguments = @()
        if ($Recursive) {
            $arguments += "-r"
        }
        $arguments += @($remoteSpec, $LocalPath)
        return (& $scpPath @arguments)
    }

    $gitLocalPath = ConvertTo-TmGitBashPath -PathValue $LocalPath
    $commandParts = @("scp")
    if ($Recursive) {
        $commandParts += "-r"
    }
    $commandParts += @(
        (ConvertTo-TmBashSingleQuotedValue $remoteSpec),
        (ConvertTo-TmBashSingleQuotedValue $gitLocalPath)
    )
    $scriptBody = @(
        "set -euo pipefail"
        ($commandParts -join " ")
    ) -join "`n"
    return Invoke-TmGitBashWrapper -ScriptBody $scriptBody
}
