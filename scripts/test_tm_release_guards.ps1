$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmRemoteTools.ps1")
. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Assert-Throws {
    param(
        [scriptblock]$Action,
        [string]$Message
    )

    try {
        & $Action
    } catch {
        return
    }

    throw $Message
}

function Get-RemoteScriptBody {
    param([string]$Path)

    $content = Get-Content -LiteralPath $Path -Raw
    $match = [regex]::Match(
        $content,
        '\$remoteScript\s*=\s*@''\r?\n(?<body>.*?)\r?\n''@',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    if (-not $match.Success) {
        throw "Could not find remote script in $Path"
    }

    return ($match.Groups["body"].Value -replace "`r`n", "`n")
}

function Get-BashFunction {
    param(
        [string]$ScriptText,
        [string]$Name
    )

    $pattern = '(?ms)^' + [regex]::Escape($Name) + '\(\) \{\n.*?^\}'
    $match = [regex]::Match($ScriptText, $pattern)
    if (-not $match.Success) {
        throw "Could not find Bash function $Name"
    }

    return $match.Value
}

function Get-PowerShellFunctionDefinition {
    param(
        [string]$Path,
        [string]$Name
    )

    $tokens = $null
    $errors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errors)
    if ($errors.Count -gt 0) {
        throw "PowerShell parse failed for $Path`: $($errors[0].Message)"
    }

    $functionAst = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $Name
    }, $true) | Select-Object -First 1
    if ($null -eq $functionAst) {
        throw "Could not find PowerShell function $Name in $Path"
    }

    return $functionAst.Extent.Text
}

function Invoke-TextProcess {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [AllowNull()]
        [string]$InputText,
        [hashtable]$Environment = @{}
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $FilePath
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    foreach ($argument in $ArgumentList) {
        [void]$startInfo.ArgumentList.Add($argument)
    }
    foreach ($name in $Environment.Keys) {
        $startInfo.Environment[[string]$name] = [string]$Environment[$name]
    }

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    [void]$process.Start()
    if ($null -ne $InputText) {
        $process.StandardInput.Write($InputText)
    }
    $process.StandardInput.Close()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    return [pscustomobject]@{
        ExitCode = $process.ExitCode
        StdOut = $stdout
        StdErr = $stderr
    }
}

function Invoke-Bash {
    param(
        [string]$ScriptText,
        [string[]]$Arguments = @(),
        [hashtable]$Environment = @{}
    )

    $bashPath = Get-TmGitBashPath
    if ([string]::IsNullOrWhiteSpace($bashPath)) {
        throw "Git Bash is required for TM release guard tests."
    }

    return Invoke-TextProcess -FilePath $bashPath -ArgumentList (@("-s", "--") + $Arguments) -InputText $ScriptText -Environment $Environment
}

function Invoke-PythonSnippet {
    param(
        [string]$Code,
        [string]$Json,
        [string[]]$Arguments = @(),
        [hashtable]$Environment = @{}
    )

    $pythonCommand = Get-Command python -ErrorAction Stop | Select-Object -First 1
    return Invoke-TextProcess -FilePath $pythonCommand.Source -ArgumentList (@("-c", $Code) + $Arguments) -InputText $Json -Environment $Environment
}

$deployPath = Join-Path $PSScriptRoot "deploy_tm_server.ps1"
$stagingPath = Join-Path $PSScriptRoot "deploy_tm_staging.ps1"
$releasePath = Join-Path $PSScriptRoot "release_tm_prod.ps1"
$promotePath = Join-Path $PSScriptRoot "promote_tm_staging_to_prod.ps1"
$rolloutPath = Join-Path $PSScriptRoot "rollout_tm_server.ps1"
$sentryReleasePath = Join-Path $PSScriptRoot "lib\TmSentryRelease.ps1"

$deployRemote = Get-RemoteScriptBody -Path $deployPath
$promoteRemote = Get-RemoteScriptBody -Path $promotePath
$deploySource = Get-Content -LiteralPath $deployPath -Raw
$releaseSource = Get-Content -LiteralPath $releasePath -Raw
$promoteSource = Get-Content -LiteralPath $promotePath -Raw
$rolloutSource = Get-Content -LiteralPath $rolloutPath -Raw
$stagingSource = Get-Content -LiteralPath $stagingPath -Raw
$sentryReleaseSource = Get-Content -LiteralPath $sentryReleasePath -Raw

# Production releases disable the legacy five-minute SQLite reconciliation timer.
# The tm-elo HTTP service is separate and remains part of normal health checks.
$deployDisablePeriodicElo = Get-BashFunction -ScriptText $deployRemote -Name "disable_periodic_elo_sync"
$promoteDisablePeriodicElo = Get-BashFunction -ScriptText $promoteRemote -Name "disable_periodic_elo_sync"
Assert-True ($deployDisablePeriodicElo -eq $promoteDisablePeriodicElo) "Deploy and promote periodic ELO invariants drifted apart."
Assert-True ($deployRemote.Contains('if [ "$environment" = "prod" ] && ! disable_periodic_elo_sync; then')) "Direct deploy does not scope periodic ELO shutdown to prod."
Assert-True ($promoteRemote.Contains('if ! disable_periodic_elo_sync; then')) "Prod promote does not enforce the periodic ELO invariant."

$periodicEloHarness = @'
set -euo pipefail
legacy_elo_timer="tm-sync-elo.timer"
legacy_elo_sync_service="tm-sync-elo.service"
mode="$1"
calls="${TMPDIR:-/tmp}/tm-periodic-elo-calls-$$"
: > "$calls"
systemctl() {
  printf '%s\n' "$*" >> "$calls"
  case "$*" in
    "--user show tm-sync-elo.timer --property=LoadState --value")
      [ "$mode" = "missing" ] && printf 'not-found\n' || printf 'loaded\n'
      ;;
    "--user show tm-sync-elo.service --property=LoadState --value")
      [ "$mode" = "missing" ] && printf 'not-found\n' || printf 'loaded\n'
      ;;
    "--user disable --now tm-sync-elo.timer"|"--user stop tm-sync-elo.service") ;;
    "--user show tm-sync-elo.timer --property=ActiveState --value") printf 'inactive\n' ;;
    "--user is-enabled tm-sync-elo.timer")
      [ "$mode" = "stuck-enabled" ] && printf 'enabled\n' || printf 'disabled\n'
      ;;
    "--user show tm-sync-elo.service --property=ActiveState --value") printf 'inactive\n' ;;
    *) return 1 ;;
  esac
}
__DISABLE_FUNCTION__
set +e
disable_periodic_elo_sync
result=$?
set -e
cat "$calls"
rm -f "$calls"
exit "$result"
'@
$periodicEloHarness = $periodicEloHarness.Replace('__DISABLE_FUNCTION__', $deployDisablePeriodicElo)
$periodicEloActive = Invoke-Bash -ScriptText $periodicEloHarness -Arguments @('active')
Assert-True ($periodicEloActive.ExitCode -eq 0) "Active periodic ELO timer was not disabled. stderr=$($periodicEloActive.StdErr)"
Assert-True ($periodicEloActive.StdOut.Contains('--user disable --now tm-sync-elo.timer')) "Periodic ELO timer disable command was not issued."
Assert-True ($periodicEloActive.StdOut.Contains('--user stop tm-sync-elo.service')) "Running periodic ELO reconciliation was not stopped."
$periodicEloMissing = Invoke-Bash -ScriptText $periodicEloHarness -Arguments @('missing')
Assert-True ($periodicEloMissing.ExitCode -eq 0) "Missing legacy ELO units should be accepted. stderr=$($periodicEloMissing.StdErr)"
Assert-True (-not $periodicEloMissing.StdOut.Contains('--user disable --now tm-sync-elo.timer')) "Missing legacy ELO timer triggered a mutation."
$periodicEloStuck = Invoke-Bash -ScriptText $periodicEloHarness -Arguments @('stuck-enabled')
Assert-True ($periodicEloStuck.ExitCode -ne 0) "Still-enabled periodic ELO timer was accepted."

# The intended full SHA must be captured after refresh and passed through both gates.
Invoke-Expression (Get-PowerShellFunctionDefinition -Path $deployPath -Name "Assert-TmExpectedGitSha")
Invoke-Expression (Get-PowerShellFunctionDefinition -Path $releasePath -Name "Assert-ReleasePins")

$shaA = "a" * 40
$shaB = "b" * 40
$artifactSha = "c" * 64
Assert-TmExpectedGitSha -Expected $shaA -Actual $shaA.ToUpperInvariant() -Context "test source"
Assert-Throws {
    Assert-TmExpectedGitSha -Expected $shaA -Actual $shaB -Context "test source"
} "Deploy guard accepted a different source SHA."
Assert-ReleasePins -ExpectedGitSha $shaA -StagingGitSha $shaA -ArtifactSha $artifactSha
Assert-Throws {
    Assert-ReleasePins -ExpectedGitSha $shaA -StagingGitSha $shaB -ArtifactSha $artifactSha
} "Prod release guard accepted staging drift from the intended SHA."

# Pre-lock upload/work names must remain unique even in the same second.
$runTokenA = New-TmReleaseRunToken
$runTokenB = New-TmReleaseRunToken
Assert-True ($runTokenA -match '^\d{14}-\d+-[0-9a-f]{32}$') "Release run token does not include timestamp, PID, and GUID."
Assert-True ($runTokenA -ne $runTokenB) "Two same-process release run tokens collided."
Assert-True ($deploySource.Contains('$payloadArchiveName = "tm-$Environment-payload-$runToken.tar.gz"')) "Deploy payload archive is not namespaced by the unique run token."
Assert-True ($deploySource.Contains('$archiveName = "tm-$Environment-release-$runToken.tar.gz"')) "Deploy upload archive is not namespaced by the unique run token."
Assert-True ($deployRemote.Contains('release_name="${ts}-${expected_git_sha}-${run_token}"')) "Deploy release directory is not namespaced by the unique run token."
Assert-True ($promoteRemote.Contains('release_name="${ts}-${expected_git_sha}-${run_token}"')) "Promote release directory is not namespaced by the unique run token."

# Ignored realtime game ids are explicit, narrowly validated, and forwarded end to end.
$normalizedIgnored = @(Assert-TmIgnoredRealtimeGameIds -GameIds @("g_abandoned,g_second"))
Assert-True (($normalizedIgnored -join ",") -eq "g_abandoned,g_second") "Ignored realtime game ids were not normalized in order."
Assert-Throws {
    Assert-TmIgnoredRealtimeGameIds -GameIds @("g1", "g1") | Out-Null
} "Duplicate ignored realtime game ids were accepted."
Assert-Throws {
    Assert-TmIgnoredRealtimeGameIds -GameIds @("g1;rm") | Out-Null
} "Unsafe ignored realtime game id was accepted."
Assert-Throws {
    Assert-TmIgnoredRealtimeGameIds -GameIds @("g1,,g2") | Out-Null
} "Empty ignored realtime game id was accepted."
$rolloutIgnoreIndex = $rolloutSource.IndexOf('$releaseArgs += @("-IgnoredRealtimeGameId", ($ignoredRealtimeGameIds -join ","))')
$releaseIgnoreIndex = $releaseSource.IndexOf('$promoteArgs += @("-IgnoredRealtimeGameId", ($ignoredRealtimeGameIds -join ","))')
Assert-True ($rolloutIgnoreIndex -ge 0 -and $releaseIgnoreIndex -ge 0) "Ignored realtime game ids are not forwarded rollout -> release -> promote."
Assert-True ($promoteSource.Contains('$remoteScript = $remoteScript.Replace("__IGNORED_REALTIME_GAME_IDS_CSV__", $ignoredRealtimeGameIdsCsv)')) "Promote does not pass ignored ids into the locked remote gate."

# The next-service health window is a validated operator input and is rendered into the real dry-run script.
$pwshPath = (Get-Command pwsh -ErrorAction Stop | Select-Object -First 1).Source
$defaultPromoteDryRun = Invoke-TextProcess -FilePath $pwshPath -ArgumentList @(
    "-NoProfile", "-File", $promotePath, "-DryRun"
) -InputText $null
Assert-True ($defaultPromoteDryRun.ExitCode -eq 0) "Default promotion dry-run failed. stderr=$($defaultPromoteDryRun.StdErr)"
Assert-True ($defaultPromoteDryRun.StdOut.Contains('next_health_timeout_seconds="180"')) "Default promotion health window is not 180 seconds."

$overridePromoteDryRun = Invoke-TextProcess -FilePath $pwshPath -ArgumentList @(
    "-NoProfile", "-File", $promotePath, "-DryRun", "-NextServiceHealthTimeoutSeconds", "240"
) -InputText $null
Assert-True ($overridePromoteDryRun.ExitCode -eq 0) "Promotion health-window override dry-run failed. stderr=$($overridePromoteDryRun.StdErr)"
Assert-True ($overridePromoteDryRun.StdOut.Contains('next_health_timeout_seconds="240"')) "Promotion health-window override was not rendered."

$invalidPromoteDryRun = Invoke-TextProcess -FilePath $pwshPath -ArgumentList @(
    "-NoProfile", "-File", $promotePath, "-DryRun", "-NextServiceHealthTimeoutSeconds", "0"
) -InputText $null
Assert-True ($invalidPromoteDryRun.ExitCode -ne 0) "Promotion accepted a zero-second next-service health window."

Assert-True ($defaultPromoteDryRun.StdOut.Contains('realtime_game_stale_days="10"')) "Default realtime stale policy is not ten days."
$overrideStaleDaysPromoteDryRun = Invoke-TextProcess -FilePath $pwshPath -ArgumentList @(
    "-NoProfile", "-File", $promotePath, "-DryRun", "-RealtimeGameStaleDays", "14"
) -InputText $null
Assert-True ($overrideStaleDaysPromoteDryRun.ExitCode -eq 0) "Realtime stale-day override dry-run failed. stderr=$($overrideStaleDaysPromoteDryRun.StdErr)"
Assert-True ($overrideStaleDaysPromoteDryRun.StdOut.Contains('realtime_game_stale_days="14"')) "Realtime stale-day override was not rendered."

$invalidStaleDaysPromoteDryRun = Invoke-TextProcess -FilePath $pwshPath -ArgumentList @(
    "-NoProfile", "-File", $promotePath, "-DryRun", "-RealtimeGameStaleDays", "0"
) -InputText $null
Assert-True ($invalidStaleDaysPromoteDryRun.ExitCode -ne 0) "Promotion accepted a zero-day realtime stale policy."
Assert-True ($releaseSource.Contains('$promoteDryRunArgs += @("-RealtimeGameStaleDays", $RealtimeGameStaleDays)')) "Release wrapper does not forward the realtime stale-day policy during dry-run."
Assert-True ($releaseSource.Contains('$promoteArgs += @("-RealtimeGameStaleDays", $RealtimeGameStaleDays)')) "Release wrapper does not forward the realtime stale-day policy during promotion."

$refreshIndex = $rolloutSource.IndexOf('Invoke-CheckedPwsh -Arguments $refreshArgs')
$captureIndex = $rolloutSource.IndexOf('$intendedGitSha = Get-TmFullGitSha')
$deployPinIndex = $rolloutSource.IndexOf('"-ExpectedGitSha", $intendedGitSha', $captureIndex)
$releasePinIndex = $rolloutSource.IndexOf('"-ExpectedGitSha", $intendedGitSha', $deployPinIndex + 1)
Assert-True ($refreshIndex -ge 0 -and $captureIndex -gt $refreshIndex) "Rollout does not capture the intended SHA after refresh."
Assert-True ($deployPinIndex -gt $captureIndex -and $releasePinIndex -gt $deployPinIndex) "Rollout does not pin both staging deploy and prod release to the intended SHA."
Assert-True ($stagingSource.Contains('@("-ExpectedGitSha", $ExpectedGitSha)')) "Staging wrapper does not forward ExpectedGitSha."
Assert-True ($stagingSource.Contains('Get-TmStagingReleaseGitSha -Snapshot $postSnapshot -ExpectedGitSha $ExpectedGitSha')) "Staging wrapper does not validate the post-deploy manifest."
Assert-True ($sentryReleaseSource.Contains('$Snapshot.environments.staging.manifest')) "Staging manifest guard does not inspect the post-deploy manifest."
Assert-True ($sentryReleaseSource.Contains('does not match ExpectedGitSha')) "Staging manifest guard does not fail on post-deploy SHA drift."

# Release publication must establish public modes even under a strict inherited umask.
$deployPermissionHelper = Get-BashFunction -ScriptText $deployRemote -Name "normalize_release_permissions"
$promotePermissionHelper = Get-BashFunction -ScriptText $promoteRemote -Name "normalize_release_permissions"
$deployDataLinkIndex = $deployRemote.IndexOf('ln -sfn "$shared_root/elo/data.json" "$new_release_dir/elo/data.json"')
$deployPermissionIndex = $deployRemote.IndexOf('normalize_release_permissions "$new_release_dir"', $deployDataLinkIndex)
$deployCurrentSwitchIndex = $deployRemote.IndexOf('ln -sfn "$new_release_dir" "$current_link"')
$promoteDataLinkIndex = $promoteRemote.IndexOf('ln -sfn "$shared_root/elo/data.json" "$new_release_dir/elo/data.json"')
$promotePermissionIndex = $promoteRemote.IndexOf('normalize_release_permissions "$new_release_dir"', $promoteDataLinkIndex)
$promoteNextSwitchIndex = $promoteRemote.IndexOf('ln -sfn "$new_release_dir" "$prod_next_current"')
Assert-True ($deployPermissionIndex -gt $deployDataLinkIndex -and $deployPermissionIndex -lt $deployCurrentSwitchIndex) "Deploy does not normalize release permissions after assembly and before switching current."
Assert-True ($promotePermissionIndex -gt $promoteDataLinkIndex -and $promotePermissionIndex -lt $promoteNextSwitchIndex) "Promotion does not normalize release permissions after assembly and before starting the next backend."

$permissionFixtureRoot = Join-Path $env:TEMP ("tm-release-permissions-{0}-{1}" -f $PID, [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $permissionFixtureRoot -Force | Out-Null
try {
    foreach ($helperCase in @(
        [pscustomobject]@{Name = "deploy"; Function = $deployPermissionHelper},
        [pscustomobject]@{Name = "promote"; Function = $promotePermissionHelper}
    )) {
        $caseRoot = Join-Path $permissionFixtureRoot $helperCase.Name
        $caseRootBash = ConvertTo-TmGitBashPath $caseRoot
        if (-not (Test-TmRemoteToolsIsWindows)) {
        $permissionHarness = @'
set -euo pipefail
fixture_root="$1"
runtime_root="$fixture_root/runtime"
releases_root="$runtime_root/releases"
shared_root="$runtime_root/shared"
new_release_dir="$releases_root/release-1"
umask 077
mkdir -p "$new_release_dir/build/nested" "$new_release_dir/assets" "$new_release_dir/elo" \
  "$new_release_dir/db/private" "$new_release_dir/logs/private" "$new_release_dir/node_modules/private" \
  "$shared_root/elo"
printf 'main\n' > "$new_release_dir/build/main.js"
printf '{}\n' > "$new_release_dir/assets/release.json"
printf '{}\n' > "$new_release_dir/elo/data.json"
printf '{}\n' > "$new_release_dir/elo/elo-data.json"
for public_file in elo-data.json data.json solo-records.json stats.json; do
  printf '{}\n' > "$shared_root/elo/$public_file"
done
__PERMISSION_FUNCTION__
normalize_release_permissions "$new_release_dir"
for item in \
  runtime:"$runtime_root" releases:"$releases_root" shared:"$shared_root" shared_elo:"$shared_root/elo" \
  candidate:"$new_release_dir" nested:"$new_release_dir/build/nested" release_json:"$new_release_dir/assets/release.json" \
  data_json:"$new_release_dir/elo/data.json" shared_data:"$shared_root/elo/data.json" \
  private_db:"$new_release_dir/db/private" private_logs:"$new_release_dir/logs/private" \
  private_deps:"$new_release_dir/node_modules/private"; do
  printf '%s=%s\n' "${item%%:*}" "$(stat -c '%a' "${item#*:}")"
done
'@
        $permissionHarness = $permissionHarness.Replace('__PERMISSION_FUNCTION__', $helperCase.Function)
        $permissionResult = Invoke-Bash -ScriptText $permissionHarness -Arguments @($caseRootBash)
        Assert-True ($permissionResult.ExitCode -eq 0) "$($helperCase.Name) permission helper rejected a valid strict-umask fixture. stderr=$($permissionResult.StdErr)"
        $modes = @{}
        foreach ($line in ($permissionResult.StdOut -split "`r?`n")) {
            if ($line.Contains("=")) {
                $key, $value = $line -split "=", 2
                $modes[$key] = $value
            }
        }
        foreach ($directoryKey in @("runtime", "releases", "shared", "shared_elo", "candidate", "nested")) {
            Assert-True ($modes[$directoryKey] -eq "755") "$($helperCase.Name) did not make $directoryKey publicly traversable. actual=$($modes[$directoryKey])"
        }
        foreach ($fileKey in @("release_json", "data_json")) {
            Assert-True ($modes[$fileKey] -eq "644") "$($helperCase.Name) did not make $fileKey publicly readable. actual=$($modes[$fileKey])"
        }
        Assert-True ($modes["shared_data"] -eq "664") "$($helperCase.Name) did not preserve shared ELO write access while making it public."
        foreach ($privateKey in @("private_db", "private_logs", "private_deps")) {
            Assert-True ($modes[$privateKey] -eq "700") "$($helperCase.Name) changed private path $privateKey. actual=$($modes[$privateKey])"
        }
        }

        $outsideHarness = @'
set -euo pipefail
fixture_root="$1"
runtime_root="$fixture_root/runtime"
releases_root="$runtime_root/releases"
shared_root="$runtime_root/shared"
outside="$fixture_root/outside"
umask 077
mkdir -p "$releases_root" "$shared_root/elo" "$outside/build" "$outside/assets" "$outside/elo"
printf '{}\n' > "$outside/assets/release.json"
printf '{}\n' > "$outside/elo/data.json"
printf '{}\n' > "$outside/elo/elo-data.json"
before="$(stat -c '%a' "$outside")"
__PERMISSION_FUNCTION__
set +e
normalize_release_permissions "$outside"
helper_exit=$?
set -e
printf 'exit=%s\nbefore=%s\nafter=%s\n' "$helper_exit" "$before" "$(stat -c '%a' "$outside")"
'@
        $outsideHarness = $outsideHarness.Replace('__PERMISSION_FUNCTION__', $helperCase.Function)
        $outsideResult = Invoke-Bash -ScriptText $outsideHarness -Arguments @($caseRootBash)
        Assert-True ($outsideResult.ExitCode -eq 0) "$($helperCase.Name) outside-root fixture could not inspect the fail-closed result."
        Assert-True ($outsideResult.StdOut.Contains("exit=49")) "$($helperCase.Name) accepted a candidate outside releases root. stdout=$($outsideResult.StdOut) stderr=$($outsideResult.StdErr)"
        Assert-True ($outsideResult.StdOut.Contains("before=700") -and $outsideResult.StdOut.Contains("after=700")) "$($helperCase.Name) mutated an out-of-root candidate."
    }
} finally {
    Remove-Item -LiteralPath $permissionFixtureRoot -Recurse -Force -ErrorAction SilentlyContinue
}

# A matching old manifest must never bypass an occupied shared deploy lock.
$deployLockIndex = $deployRemote.IndexOf('if ! flock -n 9; then')
$deployNoOpIndex = $deployRemote.IndexOf('if [ "$environment" = "staging" ]')
Assert-True ($deployLockIndex -ge 0 -and $deployNoOpIndex -gt $deployLockIndex) "Staging no-op is not protected by the shared remote lock."

$lockSectionMatch = [regex]::Match(
    $deployRemote,
    '(?ms)^(?<body>mkdir -p "\$\(dirname "\$deploy_lock_file"\)".*?)(?=^rollback\(\) \{)'
)
Assert-True $lockSectionMatch.Success "Could not isolate the exact deploy lock/no-op section."

$tempRoot = Join-Path $env:TEMP ("tm-release-guards-{0}-{1}" -f $PID, [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
try {
    $tempRootBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $tempRoot)
    $matchingManifest = (@{
        environment = "staging"
        gitSha = $shaA
        sourceTreeClean = $true
    } | ConvertTo-Json -Compress)

    $occupiedLockScript = @"
set -euo pipefail
archive=$tempRootBash/archive.tar.gz
deploy_lock_file=$tempRootBash/deploy.lock
deploy_lock_info=$tempRootBash/deploy.lock.info
release_root=$tempRootBash/release
service=tm-staging
expected_git_sha=$shaA
expected_artifact_sha=$artifactSha
environment=staging
force_redeploy=0
candidate_source_tree_clean=true
release_url=http://unused.invalid/assets/release.json
release_url_fallback=http://unused.invalid/assets/release.json
flock() { return 1; }
curl() { printf '%s' '$matchingManifest'; }
$($lockSectionMatch.Groups["body"].Value)
"@
    $occupiedLockResult = Invoke-Bash -ScriptText $occupiedLockScript
    Assert-True ($occupiedLockResult.ExitCode -eq 75) "Occupied deploy lock did not preserve exit code 75. stdout=$($occupiedLockResult.StdOut) stderr=$($occupiedLockResult.StdErr)"
    Assert-True (-not (($occupiedLockResult.StdOut + $occupiedLockResult.StdErr).Contains("Deploy no-op"))) "Matching manifest bypassed an occupied deploy lock."

    # Exercise the exact clean-release matcher used by the atomic staging no-op.
    $noOpHelper = Get-BashFunction -ScriptText $deployRemote -Name "is_matching_clean_release"
    $pythonPath = (Get-Command python -ErrorAction Stop | Select-Object -First 1).Source
    $pythonPathBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $pythonPath)
    $noOpHarness = @"
set -euo pipefail
python3() { $pythonPathBash "`$@"; }
$noOpHelper
is_matching_clean_release "`$1" "`$2" "`$3"
"@

    $cleanMatch = Invoke-Bash -ScriptText $noOpHarness -Arguments @($matchingManifest, "staging", $shaA)
    Assert-True ($cleanMatch.ExitCode -eq 0) "Clean matching staging manifest did not no-op. stderr=$($cleanMatch.StdErr)"
    foreach ($badManifest in @(
        (@{ environment = "prod"; gitSha = $shaA; sourceTreeClean = $true } | ConvertTo-Json -Compress),
        (@{ environment = "staging"; gitSha = $shaB; sourceTreeClean = $true } | ConvertTo-Json -Compress),
        (@{ environment = "staging"; gitSha = $shaA; sourceTreeClean = $false } | ConvertTo-Json -Compress),
        '{"environment":"staging"}'
    )) {
        $badMatch = Invoke-Bash -ScriptText $noOpHarness -Arguments @($badManifest, "staging", $shaA)
        Assert-True ($badMatch.ExitCode -ne 0) "Unsafe staging manifest was accepted by the no-op helper: $badManifest"
    }
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

# Promotion must fail closed when the public proxy is already on the alternate backend.
$proxyHelper = Get-BashFunction -ScriptText $promoteRemote -Name "require_primary_proxy_backend"
$proxyHarness = @"
set -euo pipefail
prod_port=8081
$proxyHelper
require_primary_proxy_backend "`$1"
"@
$primaryProxy = Invoke-Bash -ScriptText $proxyHarness -Arguments @("8081")
$alternateProxy = Invoke-Bash -ScriptText $proxyHarness -Arguments @("8085")
Assert-True ($primaryProxy.ExitCode -eq 0) "Primary proxy backend was unexpectedly rejected."
Assert-True ($alternateProxy.ExitCode -eq 44) "Alternate proxy backend did not block promotion with exit code 44."

# The proxy parser must reject comments, duplicates, or malformed directives as evidence.
$readProxyHelper = Get-BashFunction -ScriptText $promoteRemote -Name "read_proxy_port"
$proxyFixtureRoot = Join-Path $env:TEMP ("tm-proxy-guard-{0}-{1}" -f $PID, [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $proxyFixtureRoot -Force | Out-Null
try {
    $canonicalProxyPath = Join-Path $proxyFixtureRoot "canonical.conf"
    $commentTrapPath = Join-Path $proxyFixtureRoot "comment-trap.conf"
    $duplicateProxyPath = Join-Path $proxyFixtureRoot "duplicate.conf"
    $malformedProxyPath = Join-Path $proxyFixtureRoot "malformed.conf"
    [IO.File]::WriteAllText($canonicalProxyPath, 'set $tm_prod_backend http://127.0.0.1:8081;')
    [IO.File]::WriteAllText($commentTrapPath, "# set `$tm_prod_backend http://127.0.0.1:8081;`nset `$tm_prod_backend http://127.0.0.1:8085;")
    [IO.File]::WriteAllText($duplicateProxyPath, "set `$tm_prod_backend http://127.0.0.1:8081;`nset `$tm_prod_backend http://127.0.0.1:8085;")
    [IO.File]::WriteAllText($malformedProxyPath, 'set $tm_prod_backend http://localhost:8081;')
    $pythonPath = (Get-Command python -ErrorAction Stop | Select-Object -First 1).Source
    $pythonPathBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $pythonPath)
    $proxyParserHarness = @'
set -euo pipefail
upstream_snippet="$1"
prod_port=8081
python3() { __PYTHON__ "$@"; }
__READ_PROXY__
__REQUIRE_PROXY__
if ! observed_port="$(read_proxy_port)"; then
  exit 45
fi
require_primary_proxy_backend "$observed_port"
'@
    $proxyParserHarness = $proxyParserHarness.Replace('__PYTHON__', $pythonPathBash).Replace('__READ_PROXY__', $readProxyHelper).Replace('__REQUIRE_PROXY__', $proxyHelper)
    $canonicalProxy = Invoke-Bash -ScriptText $proxyParserHarness -Arguments @((ConvertTo-TmGitBashPath $canonicalProxyPath))
    $commentTrapProxy = Invoke-Bash -ScriptText $proxyParserHarness -Arguments @((ConvertTo-TmGitBashPath $commentTrapPath))
    $duplicateProxy = Invoke-Bash -ScriptText $proxyParserHarness -Arguments @((ConvertTo-TmGitBashPath $duplicateProxyPath))
    $malformedProxy = Invoke-Bash -ScriptText $proxyParserHarness -Arguments @((ConvertTo-TmGitBashPath $malformedProxyPath))
    Assert-True ($canonicalProxy.ExitCode -eq 0) "Canonical single proxy directive was rejected."
    Assert-True ($commentTrapProxy.ExitCode -eq 44) "Commented 8081 line hid an active alternate backend from the guard."
    Assert-True ($duplicateProxy.ExitCode -eq 45) "Duplicate active proxy directives were accepted."
    Assert-True ($malformedProxy.ExitCode -eq 45) "Malformed active proxy directive was accepted."
} finally {
    Remove-Item -LiteralPath $proxyFixtureRoot -Recurse -Force -ErrorAction SilentlyContinue
}

$promoteLockIndex = $promoteRemote.IndexOf('if ! flock -n 9; then')
$deployCasIndex = $deployRemote.IndexOf('assert_release_cas "$expected_release_baseline_b64" "/home/openclaw/tm-runtime"')
$promoteCasIndex = $promoteRemote.IndexOf('assert_release_cas "$expected_release_baseline_b64" "/home/openclaw/tm-runtime"')
$proxyGuardIndex = $promoteRemote.IndexOf('if require_primary_proxy_backend "$initial_proxy_port"; then')
$serviceAssumptionIndex = $promoteRemote.IndexOf('if ! systemctl --user cat "$service"')
$preflightIndex = $promoteRemote.IndexOf('if assert_no_realtime_games_sqlite "preflight"; then')
$promoteNoOpIndex = $promoteRemote.IndexOf('echo "Promote no-op"')
Assert-True ($promoteLockIndex -ge 0 -and $proxyGuardIndex -gt $promoteLockIndex) "Proxy backend guard is not under the shared promotion lock."
Assert-True ($serviceAssumptionIndex -gt $proxyGuardIndex -and $preflightIndex -gt $proxyGuardIndex) "Promotion makes service or live-game assumptions before validating the active proxy backend."
Assert-True ($deployCasIndex -gt $deployLockIndex -and $deployCasIndex -lt $deployNoOpIndex) "Deploy does not compare the release CAS baseline under flock before no-op/mutation."
Assert-True ($promoteCasIndex -gt $promoteLockIndex -and $promoteCasIndex -lt $promoteNoOpIndex) "Promote does not compare the release CAS baseline under flock before no-op/mutation."
Assert-True ($stagingSource.Contains('ConvertTo-TmReleaseCasBaselineBase64 -Snapshot $preSnapshot')) "Staging wrapper does not create a CAS baseline from its pre-snapshot."
Assert-True ($releaseSource.Contains('ConvertTo-TmReleaseCasBaselineBase64 -Snapshot $preSnapshot')) "Prod release wrapper does not create a CAS baseline from its pre-snapshot."
Assert-True ($promoteRemote.Contains('if [ "$expected_environment" != "staging" ]; then')) "Promotion does not require a staging manifest."
Assert-True ($promoteRemote.Contains('if [ "$expected_source_tree_clean" != "true" ]; then')) "Promotion does not require a clean source manifest."
$dependencyValidationIndex = $promoteRemote.IndexOf('if ! assert_dependency_sha "$expected_dependency_sha" "$staging_current/package-lock.json"; then')
$dependencyPathIndex = $promoteRemote.IndexOf('deps_dir="$deps_root/$expected_dependency_sha"')
Assert-True ($dependencyValidationIndex -ge 0 -and $dependencyPathIndex -gt $dependencyValidationIndex) "dependencySha256 reaches a cache path before strict content validation."
$gameDbRequirementIndex = $promoteRemote.IndexOf('if [ ! -f "$game_db_path" ]; then')
Assert-True ($gameDbRequirementIndex -ge 0 -and $gameDbRequirementIndex -lt $preflightIndex) "Promotion does not require the existing shared live game DB before its gate."
Assert-True (-not $promoteRemote.Contains('rsync -a "$legacy_prod/db/"')) "Promotion still performs an unapproved legacy game DB migration."

# Exercise the exact exhaustive SQLite latest-save gate, including legacy saves.
$nodeGateMatch = [regex]::Match(
    $promoteRemote,
    '(?ms)node - "\$game_db_path" "\$ignored_realtime_game_ids_csv" "\$realtime_game_stale_days" <<''NODE''\n(?<code>.*?)^NODE$'
)
Assert-True $nodeGateMatch.Success "Could not find the SQLite latest-save gate implementation."
$nodeGateCode = $nodeGateMatch.Groups["code"].Value
Assert-True ($nodeGateCode.Contains('created_time')) "SQLite gate does not project the latest save timestamp."
Assert-True ($nodeGateCode.Contains('SELECT game_id, MAX(save_id) AS max_save_id')) "SQLite gate does not select the latest save for every game id."
Assert-True (-not $nodeGateCode.Contains('LIMIT')) "SQLite gate still has a truncating limit."
Assert-True (-not $promoteRemote.Contains('/api/live-games')) "Promotion still relies on the filtered HTTP live-games endpoint."
Assert-True ($nodeGateCode.Contains("new Database(dbPath, {readonly: true, fileMustExist: true})")) "SQLite gate is not explicitly read-only."
Assert-True ($nodeGateCode.Contains("db.pragma('query_only = ON')")) "SQLite gate does not enable SQLite query-only mode."
$latestSaveQueryMatch = [regex]::Match(
    $nodeGateCode,
    '(?ms)return db\.prepare\(`\n(?<query>.*?)\n\s*`\)\.all\(\);'
)
Assert-True $latestSaveQueryMatch.Success "Could not isolate the SQLite latest-save query."
$latestSaveQuery = $latestSaveQueryMatch.Groups["query"].Value

$gateFunctionMatch = [regex]::Match(
    $promoteRemote,
    '(?ms)^assert_no_realtime_games_sqlite\(\) \{\n.*?^\}\n(?=\nread_proxy_port\(\) \{)'
)
Assert-True $gateFunctionMatch.Success "Could not isolate the full SQLite gate Bash function."
$gateHelper = $gateFunctionMatch.Value

function New-LatestGameRow {
    param(
        [string]$GameId,
        [hashtable]$Game,
        [int]$SaveId = 7,
        [string]$Status = "running",
        [AllowNull()]
        [object]$CreatedTime = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    )

    return [ordered]@{
        game_id = $GameId
        game = ($Game | ConvertTo-Json -Depth 20 -Compress)
        status = $Status
        save_id = $SaveId
        created_time = $CreatedTime
        visibility = "hidden-fixture"
    }
}

function ConvertTo-GateFixtureJson {
    param([object[]]$Rows)

    return (ConvertTo-Json -InputObject @($Rows) -Depth 30 -Compress)
}

$advancedTempRoot = Join-Path $env:TEMP ("tm-release-advanced-{0}-{1}" -f $PID, [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $advancedTempRoot -Force | Out-Null
try {
    $gateRoot = Join-Path $advancedTempRoot "gate-root"
    New-Item -ItemType Directory -Path $gateRoot -Force | Out-Null
    $gateRootBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $gateRoot)
    $nodePath = (Get-Command node -ErrorAction Stop | Select-Object -First 1).Source
    $nodePathBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $nodePath)
    $gateHarness = @"
set -euo pipefail
prod_current=$gateRootBash
game_db_path=$gateRootBash/unused.db
ignored_realtime_game_ids_csv="`$1"
realtime_game_stale_days="`${2:-10}"
node() { $nodePathBash "`$@"; }
$gateHelper
assert_no_realtime_games_sqlite "fixture"
"@

    $safeRows = @(
        (New-LatestGameRow -GameId "g_turn" -Game ([ordered]@{
            id = "g_turn"; phase = "action"; gameOptions = @{turnBasedGame = $true}
            players = @(@{name = "SECRET_PLAYER"; cardsInHand = @("SECRET_CARD")})
        })),
        (New-LatestGameRow -GameId "g_legacy" -Game ([ordered]@{
            id = "g_legacy"; phase = "action"
            players = @(@{telegramID = " 12345 "; name = "LEGACY_SECRET"; cardsInHand = @("HIDDEN")})
        })),
        (New-LatestGameRow -GameId "g_ended" -Game ([ordered]@{
            id = "g_ended"; phase = "end"; players = @()
        }))
    )
    $safeFixture = ConvertTo-GateFixtureJson -Rows $safeRows
    $safeGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('') -Environment @{TM_RELEASE_LIVE_GATE_FIXTURE_JSON = $safeFixture}
    Assert-True ($safeGate.ExitCode -eq 0) "Turn-based/legacy/ended SQLite fixture was rejected. stdout=$($safeGate.StdOut) stderr=$($safeGate.StdErr)"
    Assert-True ($safeGate.StdOut.Contains('running=3 turn_based=2 ended=1 ignored=0')) "SQLite gate summary misclassified safe fixtures."
    Assert-True (-not (($safeGate.StdOut + $safeGate.StdErr).Contains('SECRET_PLAYER'))) "SQLite gate leaked a player name."
    Assert-True (-not (($safeGate.StdOut + $safeGate.StdErr).Contains('SECRET_CARD'))) "SQLite gate leaked a hand card."

    $realtimeRows = @(
        (New-LatestGameRow -GameId "g_realtime" -Game ([ordered]@{
            id = "g_realtime"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        }))
    )
    $realtimeFixture = ConvertTo-GateFixtureJson -Rows $realtimeRows
    $realtimeGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{TM_RELEASE_LIVE_GATE_FIXTURE_JSON = $realtimeFixture}
    Assert-True ($realtimeGate.ExitCode -eq 42) "Explicit realtime save did not block with exit code 42."

    $gateNowSeconds = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $staleRows = @(
        (New-LatestGameRow -GameId "g_stale" -CreatedTime ($gateNowSeconds - (11 * 86400)) -Game ([ordered]@{
            id = "g_stale"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        }))
    )
    $staleGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $staleRows)
        TM_RELEASE_LIVE_GATE_NOW_SECONDS = $gateNowSeconds
    }
    Assert-True ($staleGate.ExitCode -eq 0) "A realtime save older than the stale threshold blocked promotion. stdout=$($staleGate.StdOut) stderr=$($staleGate.StdErr)"
    Assert-True ($staleGate.StdOut.Contains('realtime=0') -and $staleGate.StdOut.Contains('stale=1') -and $staleGate.StdOut.Contains('unknown=0')) "Stale realtime classification was not reported separately. stdout=$($staleGate.StdOut)"

    $mixedFreshStaleUnknownRows = @(
        (New-LatestGameRow -GameId "g_fresh" -CreatedTime ($gateNowSeconds - 86400) -Game ([ordered]@{
            id = "g_fresh"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        })),
        (New-LatestGameRow -GameId "g_stale_mixed" -CreatedTime ($gateNowSeconds - (11 * 86400)) -Game ([ordered]@{
            id = "g_stale_mixed"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        })),
        (New-LatestGameRow -GameId "g_unknown" -CreatedTime $null -Game ([ordered]@{
            id = "g_unknown"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        }))
    )
    $mixedFreshStaleUnknownGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $mixedFreshStaleUnknownRows)
        TM_RELEASE_LIVE_GATE_NOW_SECONDS = $gateNowSeconds
    }
    Assert-True ($mixedFreshStaleUnknownGate.ExitCode -eq 42) "Fresh and unknown realtime rows did not keep the gate blocking. stdout=$($mixedFreshStaleUnknownGate.StdOut) stderr=$($mixedFreshStaleUnknownGate.StdErr)"
    Assert-True ($mixedFreshStaleUnknownGate.StdOut.Contains('realtime=1') -and $mixedFreshStaleUnknownGate.StdOut.Contains('stale=1') -and $mixedFreshStaleUnknownGate.StdOut.Contains('unknown=1')) "Fresh, stale, and unknown realtime counts were not separated. stdout=$($mixedFreshStaleUnknownGate.StdOut)"

    $boundaryRows = @(
        (New-LatestGameRow -GameId "g_boundary" -CreatedTime ($gateNowSeconds - (10 * 86400)) -Game ([ordered]@{
            id = "g_boundary"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        }))
    )
    $boundaryGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $boundaryRows)
        TM_RELEASE_LIVE_GATE_NOW_SECONDS = $gateNowSeconds
    }
    Assert-True ($boundaryGate.ExitCode -eq 42) "A realtime row exactly on the stale boundary was incorrectly exempted."
    Assert-True ($boundaryGate.StdOut.Contains('realtime=1') -and $boundaryGate.StdOut.Contains('stale=0') -and $boundaryGate.StdOut.Contains('unknown=0')) "The stale boundary was not strict. stdout=$($boundaryGate.StdOut)"

    $futureAndInvalidRows = @(
        (New-LatestGameRow -GameId "g_future" -CreatedTime ($gateNowSeconds + 1) -Game ([ordered]@{
            id = "g_future"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        })),
        (New-LatestGameRow -GameId "g_bad_time" -CreatedTime "not-a-timestamp" -Game ([ordered]@{
            id = "g_bad_time"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        }))
    )
    $futureAndInvalidGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $futureAndInvalidRows)
        TM_RELEASE_LIVE_GATE_NOW_SECONDS = $gateNowSeconds
    }
    Assert-True ($futureAndInvalidGate.ExitCode -eq 42) "Future or invalid timestamps did not fail closed."
    Assert-True ($futureAndInvalidGate.StdOut.Contains('realtime=0') -and $futureAndInvalidGate.StdOut.Contains('stale=0') -and $futureAndInvalidGate.StdOut.Contains('unknown=2')) "Future or invalid timestamps were not reported as unknown. stdout=$($futureAndInvalidGate.StdOut)"

    $paddedRealtimeRows = @(
        (New-LatestGameRow -GameId "g_padded_realtime" -Status " running " -Game ([ordered]@{
            id = "g_padded_realtime"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        }))
    )
    $paddedRealtimeGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $paddedRealtimeRows)
    }
    Assert-True ($paddedRealtimeGate.ExitCode -eq 42) "Whitespace-padded running status did not block realtime promotion."

    # Execute the production query against a real temporary SQLite database without npm dependencies.
    $sqliteQueryFixture = @'
import json
import sqlite3
import sys

query = sys.stdin.read()
connection = sqlite3.connect(":memory:")
connection.execute("CREATE TABLE games (game_id TEXT, game TEXT, status TEXT, save_id INTEGER, created_time INTEGER)")
connection.execute(
    "INSERT INTO games VALUES (?, ?, ?, ?, ?)",
    (
        "g_sql_padded",
        json.dumps({"id": "g_sql_padded", "phase": "action", "gameOptions": {"turnBasedGame": False}, "players": []}),
        " running ",
        1,
        1786752000,
    ),
)
rows = connection.execute(query).fetchall()
print(json.dumps(rows, separators=(",", ":")))
'@
    $realSqliteQuery = Invoke-PythonSnippet -Code $sqliteQueryFixture -Json $latestSaveQuery
    Assert-True ($realSqliteQuery.ExitCode -eq 0) "The production SQLite query could not run against the real fixture. stderr=$($realSqliteQuery.StdErr)"
    $realSqliteRows = @($realSqliteQuery.StdOut | ConvertFrom-Json)
    Assert-True ($realSqliteRows.Count -eq 1) "The production SQLite query did not select exactly one running row."
    Assert-True ($realSqliteRows[0][0] -eq "g_sql_padded" -and $realSqliteRows[0][2] -eq " running " -and $realSqliteRows[0][4] -eq 1786752000) "The production SQLite query omitted the whitespace-padded running row or its save timestamp."

    $nonRunningRows = @(
        (New-LatestGameRow -GameId "g_not_running" -Status " not-running " -Game ([ordered]@{
            id = "g_not_running"; phase = "action"; gameOptions = @{turnBasedGame = $false}; players = @()
        }))
    )
    $nonRunningGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $nonRunningRows)
    }
    Assert-True ($nonRunningGate.ExitCode -eq 43) "A normalized non-running status did not fail closed."

    $legacyRealtimeRows = @(
        (New-LatestGameRow -GameId "g_legacy_realtime" -Game ([ordered]@{
            id = "g_legacy_realtime"; phase = "action"; players = @(@{telegramID = ""})
        }))
    )
    $legacyRealtimeGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $legacyRealtimeRows)
    }
    Assert-True ($legacyRealtimeGate.ExitCode -eq 42) "Legacy save without a Telegram id was not classified as realtime."

    $ignoredGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('g_realtime', '10') -Environment @{TM_RELEASE_LIVE_GATE_FIXTURE_JSON = $realtimeFixture}
    Assert-True ($ignoredGate.ExitCode -eq 0) "Explicitly ignored abandoned realtime game still blocked promotion. stdout=$($ignoredGate.StdOut) stderr=$($ignoredGate.StdErr)"
    Assert-True ($ignoredGate.StdOut.Contains('ignored=1 ignored_ids=g_realtime realtime=0')) "Ignored game id/count were not reported safely."

    $malformedRows = @(
        (New-LatestGameRow -GameId "g_bad" -Game ([ordered]@{
            id = "g_bad"; phase = "action"; gameOptions = @{turnBasedGame = "false"}
            players = @(@{name = "MALFORMED_SECRET"; cardsInHand = @("DO_NOT_PRINT")})
        }))
    )
    $malformedGate = Invoke-Bash -ScriptText $gateHarness -Arguments @('', '10') -Environment @{
        TM_RELEASE_LIVE_GATE_FIXTURE_JSON = (ConvertTo-GateFixtureJson -Rows $malformedRows)
    }
    Assert-True ($malformedGate.ExitCode -eq 43) "Malformed latest save did not fail closed with exit code 43."
    Assert-True (-not (($malformedGate.StdOut + $malformedGate.StdErr).Contains('MALFORMED_SECRET'))) "Fail-closed SQLite gate leaked serialized game data."

    # Dependency cache paths accept only the normalized package-lock SHA.
    $dependencyHelper = Get-BashFunction -ScriptText $promoteRemote -Name "assert_dependency_sha"
    $packageLockFixture = Join-Path $advancedTempRoot "package-lock.json"
    $packageLockRaw = "{`r`n  `"lockfileVersion`": 3`r`n}"
    [IO.File]::WriteAllText($packageLockFixture, $packageLockRaw)
    $normalizedPackageLock = ($packageLockRaw -replace "`r`n", "`n")
    $dependencySha = [Convert]::ToHexString(
        [Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($normalizedPackageLock))
    ).ToLowerInvariant()
    $packageLockBash = ConvertTo-TmGitBashPath $packageLockFixture
    $pythonPath = (Get-Command python -ErrorAction Stop | Select-Object -First 1).Source
    $pythonPathBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $pythonPath)
    $dependencyHarness = @'
set -euo pipefail
python3() { __PYTHON__ "$@"; }
__DEPENDENCY_FUNCTION__
assert_dependency_sha "$1" "$2"
'@
    $dependencyHarness = $dependencyHarness.Replace('__PYTHON__', $pythonPathBash).Replace('__DEPENDENCY_FUNCTION__', $dependencyHelper)
    $validDependency = Invoke-Bash -ScriptText $dependencyHarness -Arguments @($dependencySha, $packageLockBash)
    $traversalDependency = Invoke-Bash -ScriptText $dependencyHarness -Arguments @('../outside', $packageLockBash)
    $uppercaseDependency = Invoke-Bash -ScriptText $dependencyHarness -Arguments @($dependencySha.ToUpperInvariant(), $packageLockBash)
    $mismatchedDependency = Invoke-Bash -ScriptText $dependencyHarness -Arguments @(('e' * 64), $packageLockBash)
    Assert-True ($validDependency.ExitCode -eq 0) "Normalized package-lock SHA was rejected. stderr=$($validDependency.StdErr)"
    Assert-True ($traversalDependency.ExitCode -eq 47) "Path-traversal dependencySha was accepted."
    Assert-True ($uppercaseDependency.ExitCode -eq 47) "Non-canonical uppercase dependencySha was accepted."
    Assert-True ($mismatchedDependency.ExitCode -eq 47) "DependencySha not matching package-lock content was accepted."

    # Fixed-path ELO mirrors publish atomically per file and repair a partial prior attempt.
    $publishHelper = Get-BashFunction -ScriptText $promoteRemote -Name "publish_elo_helpers"
    $helperSourceRelease = Join-Path $advancedTempRoot "helper-source"
    $helperSourceDirectory = Join-Path $helperSourceRelease "elo"
    $helperDestination = Join-Path $advancedTempRoot "helper-destination"
    New-Item -ItemType Directory -Path $helperSourceDirectory -Force | Out-Null
    $helperContents = [ordered]@{
        "tm-sync-elo.py" = "sync-v1`n"
        "elo_aliases.py" = "aliases-v1`n"
        "player_name_aliases.json" = "{}`n"
        "player_name_overrides.json" = "{}`n"
        "excluded_games.json" = "[]`n"
    }
    foreach ($entry in $helperContents.GetEnumerator()) {
        [IO.File]::WriteAllText((Join-Path $helperSourceDirectory $entry.Key), $entry.Value)
    }
    $publishHarness = @'
set -euo pipefail
scripts_dir="$2"
run_token=20260713010101-321-0123456789abcdef0123456789abcdef
python3() { __PYTHON__ "$@"; }
__PUBLISH_FUNCTION__
publish_elo_helpers "$1" "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
'@
    $publishHarness = $publishHarness.Replace('__PYTHON__', $pythonPathBash).Replace('__PUBLISH_FUNCTION__', $publishHelper)
    $publishArguments = @((ConvertTo-TmGitBashPath $helperSourceRelease), (ConvertTo-TmGitBashPath $helperDestination))
    $initialPublish = Invoke-Bash -ScriptText $publishHarness -Arguments $publishArguments
    Assert-True ($initialPublish.ExitCode -eq 0) "Initial atomic ELO helper publication failed. stderr=$($initialPublish.StdErr)"
    foreach ($entry in $helperContents.GetEnumerator()) {
        Assert-True ((Get-Content -LiteralPath (Join-Path $helperDestination $entry.Key) -Raw) -eq $entry.Value) "Published helper differs from its release source: $($entry.Key)"
    }
    $completionPath = Join-Path $helperDestination ".tm-elo-helpers-release.json"
    $completion = Get-Content -LiteralPath $completionPath -Raw | ConvertFrom-Json
    Assert-True ($completion.artifactSha256 -eq $artifactSha -and $completion.gitSha -eq $shaA) "ELO helper completion manifest has wrong release pins."

    [IO.File]::WriteAllText((Join-Path $helperDestination "tm-sync-elo.py"), "BROKEN`n")
    $blockedDestination = Join-Path $helperDestination "player_name_overrides.json"
    Remove-Item -LiteralPath $blockedDestination -Force
    New-Item -ItemType Directory -Path $blockedDestination | Out-Null
    $partialPublish = Invoke-Bash -ScriptText $publishHarness -Arguments $publishArguments
    Assert-True ($partialPublish.ExitCode -eq 48) "Partial ELO helper publication did not fail closed with exit code 48."
    Assert-True (-not (Test-Path -LiteralPath $completionPath)) "Partial ELO helper publication left a false completion manifest."

    Remove-Item -LiteralPath $blockedDestination -Recurse -Force
    $repairPublish = Invoke-Bash -ScriptText $publishHarness -Arguments $publishArguments
    Assert-True ($repairPublish.ExitCode -eq 0) "Retry did not reconcile a partial ELO helper publication. stderr=$($repairPublish.StdErr)"
    foreach ($entry in $helperContents.GetEnumerator()) {
        Assert-True ((Get-Content -LiteralPath (Join-Path $helperDestination $entry.Key) -Raw) -eq $entry.Value) "Retry did not repair helper: $($entry.Key)"
    }
    Assert-True (Test-Path -LiteralPath $completionPath) "Repaired ELO helper set has no completion manifest."

    # Exercise the exact CAS Python body against a local two-environment runtime fixture.
    $casBlocks = [regex]::Matches($promoteRemote, '(?ms)<<''PY''\n(?<code>.*?)^PY$')
    $casBlock = $casBlocks | Where-Object { $_.Groups["code"].Value.Contains("Release CAS baseline drifted") } | Select-Object -First 1
    Assert-True ($null -ne $casBlock) "Could not find the release CAS comparator."
    $runtimeFixture = Join-Path $advancedTempRoot "runtime"
    $snapshotEnvironments = [ordered]@{}
    foreach ($environmentName in @("prod", "staging")) {
        $currentRoot = Join-Path $runtimeFixture "$environmentName\current"
        $currentAssets = Join-Path $currentRoot "assets"
        New-Item -ItemType Directory -Path $currentAssets -Force | Out-Null
        $manifest = [ordered]@{gitSha = $shaA; artifactSha256 = $artifactSha}
        [IO.File]::WriteAllText((Join-Path $currentAssets "release.json"), ($manifest | ConvertTo-Json -Compress))
        $resolvedTarget = Invoke-PythonSnippet -Code 'import pathlib, sys; print(pathlib.Path(sys.argv[1]).resolve(strict=False), end="")' -Json '' -Arguments @($currentRoot)
        Assert-True ($resolvedTarget.ExitCode -eq 0) "Python could not resolve the CAS fixture target."
        $snapshotEnvironments[$environmentName] = [pscustomobject]@{
            currentTarget = $resolvedTarget.StdOut
            manifest = [pscustomobject]$manifest
        }
    }
    $casSnapshot = [pscustomobject]@{schemaVersion = 1; environments = [pscustomobject]$snapshotEnvironments}
    $casToken = ConvertTo-TmReleaseCasBaselineBase64 -Snapshot $casSnapshot
    Assert-TmReleaseCasBaselineBase64 -Token $casToken
    $casMatch = Invoke-PythonSnippet -Code $casBlock.Groups["code"].Value -Json '' -Arguments @($runtimeFixture) -Environment @{
        TM_RELEASE_CAS_BASELINE_B64 = $casToken
    }
    Assert-True ($casMatch.ExitCode -eq 0) "Matching release CAS baseline was rejected. stderr=$($casMatch.StdErr)"

    $driftManifestPath = Join-Path $runtimeFixture "staging\current\assets\release.json"
    [IO.File]::WriteAllText($driftManifestPath, (@{gitSha = $shaA; artifactSha256 = ("d" * 64)} | ConvertTo-Json -Compress))
    $casDrift = Invoke-PythonSnippet -Code $casBlock.Groups["code"].Value -Json '' -Arguments @($runtimeFixture) -Environment @{
        TM_RELEASE_CAS_BASELINE_B64 = $casToken
    }
    Assert-True ($casDrift.ExitCode -eq 46) "Release CAS drift did not use distinct exit code 46."
    Assert-True (-not (($casDrift.StdOut + $casDrift.StdErr).Contains($advancedTempRoot))) "Release CAS failure leaked runtime paths."

    # A failed nginx validation during rollback must still restore in deterministic order.
    $restoreHelper = Get-BashFunction -ScriptText $promoteRemote -Name "restore_public_state"
    $rollbackLogPath = Join-Path $advancedTempRoot "rollback.log"
    $rollbackBackupPath = Join-Path $advancedTempRoot "nginx-before.conf"
    [IO.File]::WriteAllText($rollbackBackupPath, 'set $tm_prod_backend http://127.0.0.1:8081;')
    $rollbackLogBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $rollbackLogPath)
    $rollbackBackupBash = ConvertTo-TmBashSingleQuotedValue (ConvertTo-TmGitBashPath $rollbackBackupPath)
    $rollbackHarness = @'
set -euo pipefail
log_path=__LOG_PATH__
nginx_snippet_backup=__BACKUP_PATH__
upstream_snippet=/etc/nginx/snippets/tm-prod-active-upstream.conf
previous_current_link_existed=1
previous_current_link_target=../releases/old
prod_current=/runtime/prod/current
service=tm-server
elo_service=tm-elo
health_url=http://127.0.0.1:8081
elo_health_url=http://127.0.0.1:8082/api/elo-submit
active_proxy_port=8085
: > "$log_path"
ln() { printf 'ln:%s\n' "$*" >> "$log_path"; return 0; }
systemctl() { printf 'systemctl:%s\n' "$*" >> "$log_path"; return 0; }
wait_for_http() { printf 'wait-http:%s\n' "$*" >> "$log_path"; return 0; }
wait_for_elo() { printf 'wait-elo:%s\n' "$*" >> "$log_path"; return 0; }
read_proxy_port() { printf '8081\n'; }
sudo() {
  printf 'sudo:%s\n' "$*" >> "$log_path"
  if [ "$1" = "nginx" ] && [ "${2:-}" = "-t" ]; then
    return 1
  fi
  return 0
}
__RESTORE_FUNCTION__
set +e
restore_public_state
restore_exit=$?
set -e
cat "$log_path"
exit "$restore_exit"
'@
    $rollbackHarness = $rollbackHarness.Replace('__LOG_PATH__', $rollbackLogBash).Replace('__BACKUP_PATH__', $rollbackBackupBash).Replace('__RESTORE_FUNCTION__', $restoreHelper)
    $rollbackResult = Invoke-Bash -ScriptText $rollbackHarness
    Assert-True ($rollbackResult.ExitCode -eq 1) "Mocked nginx rollback failure did not remain fail-closed."
    $rollbackLog = $rollbackResult.StdOut
    $linkRestoreIndex = $rollbackLog.IndexOf('ln:-sfn ../releases/old /runtime/prod/current')
    $primaryRestoreIndex = $rollbackLog.IndexOf('systemctl:--user restart tm-server')
    $snippetRestoreIndex = $rollbackLog.IndexOf('sudo:cp -a --remove-destination --')
    $nginxTestIndex = $rollbackLog.IndexOf('sudo:nginx -t')
    $eloRestoreIndex = $rollbackLog.IndexOf('systemctl:--user restart tm-elo')
    Assert-True ($linkRestoreIndex -ge 0 -and $primaryRestoreIndex -gt $linkRestoreIndex) "Rollback did not restore the exact previous current link before restarting primary."
    Assert-True ($snippetRestoreIndex -gt $primaryRestoreIndex -and $nginxTestIndex -gt $snippetRestoreIndex) "Rollback did not restore the exact nginx snippet before validation."
    Assert-True ($eloRestoreIndex -gt $nginxTestIndex) "Rollback stopped before attempting to restore the ELO service after nginx failure."
} finally {
    Remove-Item -LiteralPath $advancedTempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

# The DB gate is run twice, with the second check immediately before guarded public mutation.
$secondGateIndex = $promoteRemote.IndexOf('if assert_no_realtime_games_sqlite "before-public-switch"; then')
$backupIndex = $promoteRemote.IndexOf('if ! backup_public_state; then')
$switchLinkIndex = $promoteRemote.IndexOf('if ! ln -sfn "$new_release_dir" "$prod_current"; then')
$switchNextIndex = $promoteRemote.IndexOf('if ! set_proxy_port "$next_port"; then')
$switchPrimaryIndex = $promoteRemote.IndexOf('if ! set_proxy_port "$prod_port"; then')
$noOpHelperRepairIndex = $promoteRemote.IndexOf('if ! publish_elo_helpers "$staging_current" "$expected_artifact_sha" "$expected_git_sha"; then')
$successfulHelperPublishIndex = $promoteRemote.IndexOf('if ! publish_elo_helpers "$new_release_dir" "$served_artifact_sha" "$served_git_sha"; then')
Assert-True ($preflightIndex -ge 0 -and $secondGateIndex -gt $preflightIndex) "Promotion does not run the SQLite gate twice."
Assert-True ($backupIndex -lt $secondGateIndex -and $switchLinkIndex -gt $secondGateIndex) "Second SQLite gate is not immediately before the public switch."
Assert-True ($switchNextIndex -gt $switchLinkIndex -and $switchPrimaryIndex -gt $switchNextIndex) "Public link/next/final proxy switches are not all explicitly guarded."
Assert-True ($successfulHelperPublishIndex -gt $switchPrimaryIndex) "Prod ELO helper mirrors are mutated before the public release transaction succeeds."
Assert-True ($noOpHelperRepairIndex -ge 0 -and $noOpHelperRepairIndex -lt $promoteNoOpIndex) "Exact-prod no-op does not reconcile a prior partial ELO helper publication."
Assert-True ($promoteRemote.Contains('os.replace(temporary, path)') -and $promoteRemote.Contains('.tm-elo-helpers-release.json')) "ELO helper publication lacks atomic same-directory replacement and completion state."
Assert-True ($promoteRemote.Contains('sudo cp -a -- "$upstream_snippet" "$nginx_snippet_backup"')) "Promotion does not back up the exact nginx snippet."
Assert-True ($promoteRemote.Contains('sudo cp -a --remove-destination -- "$nginx_snippet_backup" "$upstream_snippet"')) "Rollback does not restore the exact nginx snippet."
Assert-True ($promoteRemote.Contains('rollback_after_public_switch "Could not switch public traffic to the next backend."')) "Next-backend nginx failure does not enter transactional rollback."
Assert-True ($promoteRemote.Contains('rollback_after_public_switch "Could not switch public traffic back to the primary backend."')) "Final nginx failure does not enter transactional rollback."

Write-Host "tm release guards regressions: OK"
