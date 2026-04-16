param(
    [string]$HostAlias = "vps",
    [int]$LocalPort = 18084,
    [int]$RemotePort = 8084
)

$ErrorActionPreference = "Stop"

Write-Host "Opening TM staging tunnel"
Write-Host "Local  : http://127.0.0.1:$LocalPort/"
Write-Host "Remote : $HostAlias -> 127.0.0.1:$RemotePort"
Write-Host "Press Ctrl+C to close the tunnel."

& ssh.exe -N -L "${LocalPort}:127.0.0.1:${RemotePort}" $HostAlias
