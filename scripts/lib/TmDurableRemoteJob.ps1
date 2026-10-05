$ErrorActionPreference = "Stop"

# Linux job execution is independent of the SSH observer. The payload owns all
# deploy locks, release guards, recovery, and service mutations.
function Get-TmDurableJobStartScript {
    param([string]$JobDirectory, [string]$ScriptText)

    $normalizedScript = ($ScriptText -replace "`r`n", "`n") -replace "`r", "`n"
    $payload = [Text.Encoding]::UTF8.GetBytes($normalizedScript)
    $payloadBase64 = [Convert]::ToBase64String($payload)
    $payloadSha = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($payload)).ToLowerInvariant()
    $scriptText = @'
set -euo pipefail
umask 077
job=__JOB_DIRECTORY__
command -v nohup >/dev/null
command -v setsid >/dev/null
mkdir -p "$(dirname "$job")"
# A repeated start must never replace or re-run an existing operation.
mkdir "$job"
printf '%s' '__PAYLOAD_BASE64__' | base64 -d > "$job/payload.sh"
printf '%s  %s\n' '__PAYLOAD_SHA__' "$job/payload.sh" | sha256sum -c - >/dev/null
cat > "$job/run.sh" <<'RUNNER'
#!/usr/bin/env bash
set -uo pipefail
job="$(cd -- "$(dirname -- "$0")" && pwd)"
printf '%s\n' "$$" > "$job/pid.tmp"
mv "$job/pid.tmp" "$job/pid"
bash "$job/payload.sh"
status=$?
printf '%s\n' "$status" > "$job/exit-code.tmp"
mv "$job/exit-code.tmp" "$job/exit-code"
exit "$status"
RUNNER
nohup setsid bash "$job/run.sh" </dev/null >"$job/job.log" 2>&1 &
for attempt in $(seq 1 100); do
  if [ -f "$job/pid" ]; then
    echo "Durable job started: $job"
    exit 0
  fi
  sleep 0.1
done
echo "Job launch unconfirmed; inspect $job before any new promotion." >&2
exit 70
'@
    return $scriptText.Replace('__JOB_DIRECTORY__', (ConvertTo-TmBashSingleQuotedValue $JobDirectory)).Replace('__PAYLOAD_BASE64__', $payloadBase64).Replace('__PAYLOAD_SHA__', $payloadSha)
}

function Get-TmDurableJobStatusScript {
    param([string]$JobDirectory)

    $scriptText = @'
set -euo pipefail
job=__JOB_DIRECTORY__
if [ -f "$job/exit-code" ]; then
  code="$(cat "$job/exit-code")"
  [[ "$code" =~ ^[0-9]{1,3}$ ]] && [ "$code" -le 255 ]
  printf '{"state":"completed","exitCode":%s}\n' "$code"
elif [ -f "$job/pid" ]; then
  pid="$(cat "$job/pid")"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null &&
     tr '\0' '\n' < "/proc/$pid/cmdline" | grep -Fx -- "$job/run.sh" >/dev/null; then
    echo '{"state":"running"}'
  else
    echo '{"state":"unknown"}'
  fi
else
  echo '{"state":"unknown"}'
fi
'@
    return $scriptText.Replace('__JOB_DIRECTORY__', (ConvertTo-TmBashSingleQuotedValue $JobDirectory))
}

function Wait-TmDurableRemoteJob {
    param(
        [string]$HostAlias,
        [string]$JobDirectory,
        [ValidateRange(1, 7200)]
        [int]$TimeoutSeconds = 3600
    )

    $watch = [Diagnostics.Stopwatch]::StartNew()
    while ($watch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $statusText = Invoke-TmSshScript -HostAlias $HostAlias -ScriptText (Get-TmDurableJobStatusScript -JobDirectory $JobDirectory)
        $status = ($statusText -join "`n") | ConvertFrom-Json
        if ($status.state -eq "completed") {
            $jobLog = ConvertTo-TmBashSingleQuotedValue "$JobDirectory/job.log"
            $output = Invoke-TmSshCommand -HostAlias $HostAlias -RemoteCommand "cat -- $jobLog"
            Assert-TmRemoteCommandSucceeded -ExitCode $status.exitCode -Context "Durable promotion $JobDirectory" -Output $output
            return $output
        }
        if ($status.state -ne "running") {
            throw "Promotion status is unknown: $JobDirectory. Inspect the job and deploy lock; do not start another promotion."
        }
        Write-Host "Promotion still running: $JobDirectory"
        Start-Sleep -Seconds 5
    }
    throw "Stopped waiting for $JobDirectory; the remote operation was NOT cancelled. Reconnect to the same run token."
}
