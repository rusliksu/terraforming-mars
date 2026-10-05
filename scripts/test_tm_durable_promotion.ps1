param(
    [string]$WorkRoot,
    [string]$WslDistribution = "spec-kitty-baseline",
    [switch]$ForegroundBaseline,
    [switch]$MutateSessionIsolation
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/TmRemoteTools.ps1")
. (Join-Path $PSScriptRoot "lib/TmDurableRemoteJob.ps1")

if ([string]::IsNullOrWhiteSpace($WorkRoot)) {
    $WorkRoot = if ($IsWindows) { "D:/tm-db/smartbot-lab/durable-promotion" } else { [IO.Path]::GetTempPath() }
}
$testRoot = Join-Path $WorkRoot ("durable-promotion-" + [guid]::NewGuid().ToString("N"))
[void](New-Item -ItemType Directory -Path $testRoot)

# Test the real promotion exit handler; only its service boundary is a fixture.
$source = Get-Content -LiteralPath (Join-Path $PSScriptRoot "promote_tm_staging_to_prod.ps1") -Raw
$handler = [regex]::Match($source, '(?ms)^handle_promote_exit\(\) \{\r?\n.*?^\}').Value
if ([string]::IsNullOrEmpty($handler)) { throw "Missing promotion exit handler." }
$payload = @'
set -euo pipefail
fixture=/__TM_JOB_FIXTURE__
deploy_lock_info="$fixture/lock-info"
database_backup="$fixture/no-backup"
service=fixture-server
health_url=fixture-health
primary_stopped=0
cutover_in_progress=0
systemctl() { printf 'active\n' > "$fixture/service"; }
wait_for_http() { return 0; }
restore_previous_release() { printf 'active\n' > "$fixture/service"; }
__EXIT_HANDLER__
trap handle_promote_exit EXIT
exec 9>"$fixture/deploy.lock"
flock -n 9 || exit 75
printf 'invoked\n' >> "$fixture/invocations"
printf 'ready\n' > "$fixture/before-stop"
while [ ! -f "$fixture/stop-allowed" ]; do sleep 0.05; done
primary_stopped=1
cutover_in_progress=1
printf 'stopped\n' > "$fixture/service"
printf 'ready\n' > "$fixture/after-stop"
while [ ! -f "$fixture/finish-allowed" ]; do sleep 0.05; done
if [ -f "$fixture/fail" ]; then exit 23; fi
printf 'active\n' > "$fixture/service"
primary_stopped=0
cutover_in_progress=0
printf 'committed\n' > "$fixture/committed"
echo 'Promote ok'
'@
$payload = $payload.Replace('__EXIT_HANDLER__', ($handler -replace "`r`n", "`n"))
$launcher = Get-TmDurableJobStartScript -JobDirectory '/__TM_JOB_FIXTURE__/job' -ScriptText $payload
if ($ForegroundBaseline) {
    # The former transport executes the payload directly in the SSH session.
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))
    $launcher = "printf '%s' '$encoded' | base64 -d | bash"
}
if ($MutateSessionIsolation) {
    $launcher = $launcher.Replace('nohup setsid bash', 'nohup bash')
}
$utf8 = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText((Join-Path $testRoot "start.sh"), ($launcher -replace "`r`n", "`n"), $utf8)
[IO.File]::WriteAllText((Join-Path $testRoot "status.sh"), ((Get-TmDurableJobStatusScript -JobDirectory '/__TM_JOB_FIXTURE__/job') -replace "`r`n", "`n"), $utf8)
$pythonTest = Join-Path $PSScriptRoot 'tests/test_tm_durable_promotion.py'
$testArguments = if ($ForegroundBaseline) { @('-k', 'disconnect') } else { @() }
if ($IsWindows) {
    # This test distro does not mount Windows drives. Pass only fixture code,
    # not a workspace or production database, into its temporary directory.
    $fixtureInput = @{
        start = Get-Content -LiteralPath (Join-Path $testRoot 'start.sh') -Raw
        status = Get-Content -LiteralPath (Join-Path $testRoot 'status.sh') -Raw
        test = Get-Content -LiteralPath $pythonTest -Raw
    } | ConvertTo-Json -Compress
    $bootstrap = @'
import json, pathlib, sys, tempfile
data = json.load(sys.stdin)
root = pathlib.Path(tempfile.mkdtemp(prefix="tm-durable-promotion-"))
for name in ("start", "status"):
    (root / (name + ".sh")).write_text(data[name])
print("Linux process fixtures: " + str(root), flush=True)
sys.argv = ["test_tm_durable_promotion.py", str(root)] + sys.argv[1:]
exec(compile(data["test"], "test_tm_durable_promotion.py", "exec"))
'@
    $fixtureInput | & wsl -d $WslDistribution -- python3 -c $bootstrap @testArguments
} else {
    & python3 $pythonTest $testRoot @testArguments
}
if ($LASTEXITCODE -ne 0) { throw "Durable promotion integration tests failed. Artifacts: $testRoot" }
Write-Host "Durable promotion integration tests: OK. Artifacts: $testRoot"
