$ErrorActionPreference = "Stop"

$script:TmUpstreamSyncExitCodes = [ordered]@{
    Success = 0
    Conflict = 20
    StaleRef = 30
    Validation = 40
    LockBusy = 75
}
$script:TmUpstreamSyncToolRoot = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path)

function Get-TmUpstreamSyncExitCodes {
    return [pscustomobject]$script:TmUpstreamSyncExitCodes
}

function Invoke-TmSyncProcess {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string[]]$ArgumentList,
        [AllowNull()]
        [string]$StandardInput,
        [AllowNull()]
        [string]$WorkingDirectory
    )

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = [Diagnostics.ProcessStartInfo]::new()
    $process.StartInfo.FileName = $FilePath
    foreach ($argument in $ArgumentList) {
        [void]$process.StartInfo.ArgumentList.Add($argument)
    }
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.RedirectStandardInput = $null -ne $StandardInput
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $process.StartInfo.WorkingDirectory = $WorkingDirectory
    }

    try {
        [void]$process.Start()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        if ($null -ne $StandardInput) {
            $process.StandardInput.Write($StandardInput)
            $process.StandardInput.Close()
        }
        $process.WaitForExit()
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        return [pscustomobject]@{
            ExitCode = $process.ExitCode
            StdOut = $stdout.TrimEnd("`r", "`n")
            StdErr = $stderr.TrimEnd("`r", "`n")
        }
    } finally {
        $process.Dispose()
    }
}

function Invoke-TmSyncGit {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryRoot,
        [Parameter(Mandatory)]
        [string[]]$ArgumentList,
        [switch]$AllowFailure,
        [AllowNull()]
        [string]$StandardInput
    )

    $git = Get-Command git -ErrorAction Stop | Select-Object -First 1
    $arguments = @("-C", $RepositoryRoot) + $ArgumentList
    $result = Invoke-TmSyncProcess -FilePath $git.Source -ArgumentList $arguments -StandardInput $StandardInput
    if (-not $AllowFailure -and $result.ExitCode -ne 0) {
        $detail = @($result.StdOut, $result.StdErr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        $suffix = if ($detail.Count -gt 0) { "`n" + ($detail -join "`n") } else { "" }
        throw "git $($ArgumentList -join ' ') failed with exit code $($result.ExitCode).$suffix"
    }
    return $result
}

function Resolve-TmSyncRepositoryRoot {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    $resolved = Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop
    $topLevel = (Invoke-TmSyncGit -RepositoryRoot $resolved.Path -ArgumentList @("rev-parse", "--show-toplevel")).StdOut
    $topLevelPath = [IO.Path]::GetFullPath($topLevel).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $requestedPath = [IO.Path]::GetFullPath($resolved.Path).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if (-not $topLevelPath.Equals($requestedPath, [StringComparison]::OrdinalIgnoreCase)) {
        throw "RepositoryRoot must be the Git top-level directory. Expected '$topLevelPath', got '$requestedPath'."
    }
    return $requestedPath
}

function Assert-TmSyncReleaseCheckoutIdentity {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [switch]$AllowNonReleaseCheckout
    )

    if ($AllowNonReleaseCheckout) { return }
    $expected = $script:TmUpstreamSyncToolRoot
    if ([IO.Path]::GetFileName($expected) -ne "terraforming-mars-release-main") {
        throw "The upstream sync tool itself is not running from the required terraforming-mars-release-main checkout: $expected"
    }
    $actual = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $canonicalExpected = [IO.Path]::GetFullPath($expected).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if (-not $actual.Equals($canonicalExpected, [StringComparison]::OrdinalIgnoreCase)) {
        throw "RepositoryRoot must be the dedicated sibling checkout '$canonicalExpected'; refusing to mutate '$actual'."
    }
}

function Test-TmSyncPathWithin {
    param(
        [Parameter(Mandatory)][string]$ParentPath,
        [Parameter(Mandatory)][string]$CandidatePath
    )

    $parent = [IO.Path]::GetFullPath($ParentPath).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $candidate = [IO.Path]::GetFullPath($CandidatePath).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    return $candidate.StartsWith($parent, [StringComparison]::OrdinalIgnoreCase)
}

function Get-TmSyncRepositoryKey {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    $normalized = [IO.Path]::GetFullPath($RepositoryRoot).ToLowerInvariant()
    $bytes = [Text.Encoding]::UTF8.GetBytes($normalized)
    $hash = [Security.Cryptography.SHA256]::HashData($bytes)
    return [Convert]::ToHexString($hash).ToLowerInvariant().Substring(0, 20)
}

function Get-TmUpstreamSyncPaths {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$ReportRoot,
        [Parameter(Mandatory)][string]$RunId
    )

    $root = [IO.Path]::GetFullPath($ReportRoot)
    if (Test-TmSyncPathWithin -ParentPath $RepositoryRoot -CandidatePath $root) {
        throw "ReportRoot must be outside the repository: $root"
    }
    $key = Get-TmSyncRepositoryKey -RepositoryRoot $RepositoryRoot
    $runDirectory = Join-Path (Join-Path $root "reports") $RunId
    return [pscustomobject]@{
        Root = $root
        LockPath = Join-Path (Join-Path $root "locks") "$key.lock"
        StatePath = Join-Path (Join-Path $root "states") "$key.json"
        RunDirectory = $runDirectory
        JsonReportPath = Join-Path $runDirectory "upstream-sync-report.json"
        MarkdownReportPath = Join-Path $runDirectory "upstream-sync-report.md"
    }
}

function Enter-TmUpstreamSyncLock {
    param([Parameter(Mandatory)][string]$LockPath)

    $directory = Split-Path -Parent $LockPath
    [IO.Directory]::CreateDirectory($directory) | Out-Null
    try {
        $stream = [IO.File]::Open($LockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        $payload = [Text.Encoding]::UTF8.GetBytes("pid=$PID`nacquiredAt=$([DateTimeOffset]::UtcNow.ToString('o'))`n")
        $stream.SetLength(0)
        $stream.Write($payload, 0, $payload.Length)
        $stream.Flush()
        return $stream
    } catch [IO.IOException] {
        return $null
    }
}

function Get-TmSyncRefSha {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Ref
    )

    $result = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("rev-parse", "--verify", "$Ref^{commit}") -AllowFailure
    if ($result.ExitCode -ne 0) {
        throw "Required ref does not resolve to a commit: $Ref"
    }
    return $result.StdOut.Trim()
}

function Test-TmSyncAncestor {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Ancestor,
        [Parameter(Mandatory)][string]$Descendant
    )

    $result = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("merge-base", "--is-ancestor", $Ancestor, $Descendant) -AllowFailure
    if ($result.ExitCode -eq 0) { return $true }
    if ($result.ExitCode -eq 1) { return $false }
    throw "Could not compare ancestry for $Ancestor and $Descendant.`n$($result.StdErr)"
}

function Assert-TmSyncCheckoutClean {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    $mergeHead = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("rev-parse", "--verify", "MERGE_HEAD") -AllowFailure
    if ($mergeHead.ExitCode -eq 0) {
        throw "Checkout has a merge in progress. Use -Mode Continue or finish/abort it explicitly."
    }
    $status = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("status", "--porcelain=v1", "--untracked-files=all")).StdOut
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw "Checkout must be clean before Prepare.`n$status"
    }
}

function Get-TmSyncDirtyPaths {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    $status = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("status", "--porcelain=v1", "-z", "--untracked-files=all")).StdOut
    if ([string]::IsNullOrEmpty($status)) { return @() }
    $paths = [Collections.Generic.List[string]]::new()
    $records = @($status -split "`0")
    for ($index = 0; $index -lt $records.Count; $index++) {
        $record = $records[$index]
        if ([string]::IsNullOrEmpty($record) -or $record.Length -lt 4) { continue }
        $code = $record.Substring(0, 2)
        $paths.Add($record.Substring(3))
        if (($code.Contains("R") -or $code.Contains("C")) -and $index + 1 -lt $records.Count) {
            $index++
            if (-not [string]::IsNullOrEmpty($records[$index])) { $paths.Add($records[$index]) }
        }
    }
    return @($paths | Sort-Object -Unique)
}

function Get-TmSyncCurrentBranch {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    return (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("branch", "--show-current")).StdOut.Trim()
}

function Get-TmSyncRemoteHeadSha {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Remote,
        [Parameter(Mandatory)][string]$Branch
    )

    $result = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("ls-remote", "--exit-code", $Remote, "refs/heads/$Branch") -AllowFailure
    if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($result.StdOut)) {
        throw "Could not resolve remote head $Remote/$Branch for stale-ref protection."
    }
    $line = ($result.StdOut -split "`r?`n" | Select-Object -First 1)
    $sha = ($line -split "\s+" | Select-Object -First 1)
    if ($sha -notmatch "^[0-9a-fA-F]{40,64}$") {
        throw "Unexpected ls-remote output for $Remote/${Branch}: $line"
    }
    return $sha.ToLowerInvariant()
}

function Resolve-TmSyncCandidateBranch {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$OriginRemote,
        [AllowNull()][string]$RequestedBranch,
        [switch]$NoFetch
    )

    $prefix = "sync/upstream/"
    $localBranches = @()
    $localOutput = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
        "for-each-ref", "--format=%(refname)", "refs/heads/$prefix"
    )).StdOut
    foreach ($line in ($localOutput -split "`r?`n")) {
        $ref = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($ref)) { continue }
        if (-not $ref.StartsWith("refs/heads/$prefix", [StringComparison]::Ordinal)) {
            throw "Unexpected local candidate ref: $ref"
        }
        $localBranches += $ref.Substring("refs/heads/".Length)
    }

    $remoteByBranch = @{}
    if ($NoFetch) {
        $trackingOutput = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
            "for-each-ref", "--format=%(objectname)%09%(refname)", "refs/remotes/$OriginRemote/$prefix"
        )).StdOut
        foreach ($line in ($trackingOutput -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $parts = $line -split "`t", 2
            $trackingPrefix = "refs/remotes/$OriginRemote/"
            if ($parts.Count -ne 2 -or $parts[0] -notmatch "^[0-9a-fA-F]{40,64}$" -or
                -not $parts[1].StartsWith("$trackingPrefix$prefix", [StringComparison]::Ordinal)) {
                throw "Unexpected candidate tracking ref: $line"
            }
            $branch = $parts[1].Substring($trackingPrefix.Length)
            $remoteByBranch[$branch] = $parts[0].ToLowerInvariant()
        }
    } else {
        $remoteOutput = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
            "ls-remote", "--heads", $OriginRemote, "refs/heads/$prefix*"
        )
        foreach ($line in ($remoteOutput.StdOut -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $match = [regex]::Match($line, "^(?<sha>[0-9a-fA-F]{40,64})\s+refs/heads/(?<branch>sync/upstream/.+)$")
            if (-not $match.Success) { throw "Unexpected remote candidate ref: $line" }
            $branch = $match.Groups["branch"].Value
            $valid = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("check-ref-format", "refs/heads/$branch") -AllowFailure
            if ($valid.ExitCode -ne 0) { throw "Remote returned an invalid candidate branch: $branch" }
            $remoteByBranch[$branch] = $match.Groups["sha"].Value.ToLowerInvariant()
        }
    }

    $allCandidates = @($localBranches + @($remoteByBranch.Keys) | Sort-Object -Unique)
    if ($allCandidates.Count -gt 1) {
        throw "Multiple sync candidates exist; consolidate them before continuing: $($allCandidates -join ', ')"
    }

    if (-not [string]::IsNullOrWhiteSpace($RequestedBranch)) {
        if (-not $RequestedBranch.StartsWith($prefix, [StringComparison]::Ordinal)) {
            throw "CandidateBranch must be under $prefix"
        }
        if ($allCandidates.Count -eq 1 -and $RequestedBranch -ne $allCandidates[0]) {
            throw "Candidate '$($allCandidates[0])' already exists; explicit selection cannot create or choose a second sync candidate '$RequestedBranch'."
        }
        $selected = $RequestedBranch
    } else {
        $selected = if ($allCandidates.Count -eq 1) { $allCandidates[0] } else { "sync/upstream/main" }
    }

    $checkRef = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("check-ref-format", "refs/heads/$selected") -AllowFailure
    if ($checkRef.ExitCode -ne 0) { throw "Invalid candidate branch name: $selected" }

    $remoteSha = if ($remoteByBranch.ContainsKey($selected)) { [string]$remoteByBranch[$selected] } else { $null }
    if ($null -ne $remoteSha -and -not $NoFetch) {
        Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
            "fetch", "--no-tags", $OriginRemote,
            "+refs/heads/${selected}:refs/remotes/$OriginRemote/$selected"
        ) | Out-Null
        $remoteSha = Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "refs/remotes/$OriginRemote/$selected"
    }
    $local = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("rev-parse", "--verify", "refs/heads/$selected^{commit}") -AllowFailure
    return [pscustomobject]@{
        Branch = $selected
        LocalSha = if ($local.ExitCode -eq 0) { $local.StdOut.Trim() } else { $null }
        RemoteSha = $remoteSha
    }
}

function Test-TmSyncRefsFresh {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$State
    )

    $actualCanonical = Get-TmSyncRemoteHeadSha -RepositoryRoot $RepositoryRoot -Remote $State.canonical.remote -Branch $State.canonical.branch
    $actualUpstream = Get-TmSyncRemoteHeadSha -RepositoryRoot $RepositoryRoot -Remote $State.upstream.remote -Branch $State.upstream.branch
    return [pscustomobject]@{
        IsFresh = $actualCanonical -eq $State.canonical.sha -and $actualUpstream -eq $State.upstream.sha
        ExpectedCanonical = $State.canonical.sha
        ActualCanonical = $actualCanonical
        ExpectedUpstream = $State.upstream.sha
        ActualUpstream = $actualUpstream
    }
}

function Get-TmSyncConflicts {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    $unmerged = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("ls-files", "-u", "-z")).StdOut
    if ([string]::IsNullOrEmpty($unmerged)) { return @() }

    $byPath = [ordered]@{}
    foreach ($record in ($unmerged -split "`0")) {
        if ([string]::IsNullOrEmpty($record)) { continue }
        $match = [regex]::Match($record, "^(?<mode>\d+) (?<blob>[0-9a-f]+) (?<stage>[123])`t(?<path>.*)$")
        if (-not $match.Success) { continue }
        $path = $match.Groups["path"].Value
        if (-not $byPath.Contains($path)) {
            $byPath[$path] = [ordered]@{ path = $path; stages = @() }
        }
        $byPath[$path].stages += [pscustomobject]@{
            stage = [int]$match.Groups["stage"].Value
            blob = $match.Groups["blob"].Value
            mode = $match.Groups["mode"].Value
        }
    }
    return @($byPath.Values | ForEach-Object { [pscustomobject]$_ })
}

function Get-TmStablePatchId {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Commit
    )

    $exists = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-e", "$Commit^{commit}") -AllowFailure
    if ($exists.ExitCode -ne 0) { return $null }
    $patch = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("show", "--pretty=format:", "--no-ext-diff", "--binary", $Commit)).StdOut
    if ([string]::IsNullOrWhiteSpace($patch)) { return $null }
    $result = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("patch-id", "--stable") -StandardInput ($patch + "`n")
    if ([string]::IsNullOrWhiteSpace($result.StdOut)) { return $null }
    return ($result.StdOut -split "\s+" | Select-Object -First 1).ToLowerInvariant()
}

function Find-TmDuplicatePatches {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string[]]$LeftCommits,
        [Parameter(Mandatory)][string[]]$RightCommits
    )

    $rightByPatch = @{}
    foreach ($commit in $RightCommits) {
        $patchId = Get-TmStablePatchId -RepositoryRoot $RepositoryRoot -Commit $commit
        if ($null -ne $patchId) { $rightByPatch[$patchId] = $commit }
    }
    $duplicates = @()
    foreach ($commit in $LeftCommits) {
        $patchId = Get-TmStablePatchId -RepositoryRoot $RepositoryRoot -Commit $commit
        if ($null -ne $patchId -and $rightByPatch.ContainsKey($patchId)) {
            $duplicates += [pscustomobject]@{
                patchId = $patchId
                leftCommit = $commit
                rightCommit = $rightByPatch[$patchId]
            }
        }
    }
    return $duplicates
}

function Get-TmStablePatchIdsForRange {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$RevisionRange
    )

    $gitPath = (Get-Command git -ErrorAction Stop | Select-Object -First 1).Source
    $logProcess = [Diagnostics.Process]::new()
    $logProcess.StartInfo = [Diagnostics.ProcessStartInfo]::new()
    $logProcess.StartInfo.FileName = $gitPath
    foreach ($argument in @("-C", $RepositoryRoot, "log", "--no-merges", "--pretty=format:From %H Mon Sep 17 00:00:00 2001", "-p", $RevisionRange)) {
        [void]$logProcess.StartInfo.ArgumentList.Add($argument)
    }
    $logProcess.StartInfo.RedirectStandardOutput = $true
    $logProcess.StartInfo.RedirectStandardError = $true
    $logProcess.StartInfo.UseShellExecute = $false
    $logProcess.StartInfo.CreateNoWindow = $true

    $patchProcess = [Diagnostics.Process]::new()
    $patchProcess.StartInfo = [Diagnostics.ProcessStartInfo]::new()
    $patchProcess.StartInfo.FileName = $gitPath
    foreach ($argument in @("-C", $RepositoryRoot, "patch-id", "--stable")) {
        [void]$patchProcess.StartInfo.ArgumentList.Add($argument)
    }
    $patchProcess.StartInfo.RedirectStandardInput = $true
    $patchProcess.StartInfo.RedirectStandardOutput = $true
    $patchProcess.StartInfo.RedirectStandardError = $true
    $patchProcess.StartInfo.UseShellExecute = $false
    $patchProcess.StartInfo.CreateNoWindow = $true

    try {
        [void]$patchProcess.Start()
        $patchOutputTask = $patchProcess.StandardOutput.ReadToEndAsync()
        $patchErrorTask = $patchProcess.StandardError.ReadToEndAsync()
        [void]$logProcess.Start()
        $logErrorTask = $logProcess.StandardError.ReadToEndAsync()
        $logProcess.StandardOutput.BaseStream.CopyTo($patchProcess.StandardInput.BaseStream)
        $patchProcess.StandardInput.Close()
        $logProcess.WaitForExit()
        $patchProcess.WaitForExit()
        $logError = $logErrorTask.GetAwaiter().GetResult()
        $patchError = $patchErrorTask.GetAwaiter().GetResult()
        $patchOutput = $patchOutputTask.GetAwaiter().GetResult()
        if ($logProcess.ExitCode -ne 0) {
            throw "git log failed for patch-id range $RevisionRange.`n$logError"
        }
        if ($patchProcess.ExitCode -ne 0) {
            throw "git patch-id --stable failed for range $RevisionRange.`n$patchError"
        }
        $records = @()
        foreach ($line in ($patchOutput -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $parts = $line.Trim() -split "\s+"
            if ($parts.Count -ge 2) {
                $records += [pscustomobject]@{ patchId = $parts[0].ToLowerInvariant(); commit = $parts[1].ToLowerInvariant() }
            }
        }
        return $records
    } finally {
        $logProcess.Dispose()
        $patchProcess.Dispose()
    }
}

function Find-TmRangeDuplicatePatches {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$MergeBase,
        [Parameter(Mandatory)][string]$CanonicalSha,
        [Parameter(Mandatory)][string]$UpstreamSha
    )

    $canonicalRecords = @(Get-TmStablePatchIdsForRange -RepositoryRoot $RepositoryRoot -RevisionRange "$MergeBase..$CanonicalSha")
    $upstreamRecords = @(Get-TmStablePatchIdsForRange -RepositoryRoot $RepositoryRoot -RevisionRange "$MergeBase..$UpstreamSha")
    $upstreamByPatch = @{}
    foreach ($record in $upstreamRecords) {
        if (-not $upstreamByPatch.ContainsKey($record.patchId)) { $upstreamByPatch[$record.patchId] = @() }
        $upstreamByPatch[$record.patchId] += $record.commit
    }
    $duplicates = @()
    foreach ($record in $canonicalRecords) {
        if (-not $upstreamByPatch.ContainsKey($record.patchId)) { continue }
        foreach ($upstreamCommit in $upstreamByPatch[$record.patchId]) {
            $duplicates += [pscustomobject]@{
                patchId = $record.patchId
                canonicalCommit = $record.commit
                upstreamCommit = $upstreamCommit
            }
        }
    }
    return $duplicates
}

function Read-TmAdoptionLedger {
    param([Parameter(Mandatory)][string]$Path)

    $resolved = Resolve-Path -LiteralPath $Path -ErrorAction Stop
    $ledger = Get-Content -LiteralPath $resolved.Path -Raw | ConvertFrom-Json -Depth 20
    if ($ledger.schema -ne "TmUpstreamAdoptionLedgerV1" -or $ledger.schemaVersion -ne 1) {
        throw "Unsupported adoption ledger schema: $($ledger.schema) version $($ledger.schemaVersion)"
    }
    if ($null -eq $ledger.decisions -or @($ledger.decisions).Count -eq 0) {
        throw "Adoption ledger must contain at least one immutable decision."
    }
    $scopeOwners = [Collections.Generic.Dictionary[string, string]]::new([StringComparer]::Ordinal)
    foreach ($decision in $ledger.decisions) {
        if ($decision.policy -notin @("adopt_upstream", "keep_custom_overlay", "manual")) {
            throw "Unsupported adoption policy '$($decision.policy)' in $($decision.id)."
        }
        if ($decision.PSObject.Properties.Name -contains "status") {
            throw "Adoption ledger decisions must not store mutable remote status: $($decision.id)."
        }
        foreach ($commit in @($decision.customCommits)) {
            if ($commit -notmatch "^[0-9a-f]{40}$") {
                throw "Adoption ledger custom commit must be full 40-hex: '$commit' in $($decision.id)."
            }
        }
        if ($decision.policy -eq "adopt_upstream") {
            if (@($decision.customCommits).Count -eq 0) {
                throw "adopt_upstream requires at least one reviewed custom commit in $($decision.id)."
            }
            if ($null -eq $decision.resolution -or $decision.resolution.strategy -ne "restore_upstream_scope" -or $decision.resolution.auditVersion -ne 1) {
                throw "adopt_upstream requires resolution.strategy=restore_upstream_scope and auditVersion=1 in $($decision.id)."
            }
            if (@($decision.scope).Count -eq 0) {
                throw "adopt_upstream requires a non-empty exact path scope in $($decision.id)."
            }
            $decisionScope = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
            foreach ($scopePath in @($decision.scope)) {
                $path = [string]$scopePath
                if ([string]::IsNullOrWhiteSpace($path) -or $path.StartsWith("/", [StringComparison]::Ordinal) -or
                    $path.Contains("\") -or $path -match "(^|/)\.\.($|/)" -or $path -match "[?*\[]") {
                    throw "Adoption scope must contain normalized literal repository paths; invalid '$path' in $($decision.id)."
                }
                if (-not $decisionScope.Add($path)) {
                    throw "Duplicate adoption scope path '$path' in $($decision.id)."
                }
                if ($scopeOwners.ContainsKey($path)) {
                    throw "Adoption scope path '$path' overlaps decisions '$($scopeOwners[$path])' and '$($decision.id)'."
                }
                $scopeOwners.Add($path, [string]$decision.id)
            }
        }
    }
    return [pscustomobject]@{
        Path = $resolved.Path
        Sha256 = (Get-FileHash -LiteralPath $resolved.Path -Algorithm SHA256).Hash.ToLowerInvariant()
        Ledger = $ledger
    }
}

function Get-TmSyncCommitChangedPaths {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Commit
    )

    $output = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
        "diff-tree", "--root", "--no-commit-id", "--name-only", "--no-renames", "-r", "-z", $Commit
    )).StdOut
    if ([string]::IsNullOrEmpty($output)) { return @() }
    return @($output -split "`0" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique)
}

function Get-TmSyncMissingAdoptionParentObjects {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$Ledger,
        [Parameter(Mandatory)][string]$MergeBase,
        [Parameter(Mandatory)][string]$CanonicalSha
    )

    $missing = @()
    foreach ($decision in $Ledger.decisions | Where-Object { $_.policy -eq "adopt_upstream" }) {
        $candidates = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList (@(
            "rev-list", "--full-history", "--no-merges", "$MergeBase..$CanonicalSha", "--"
        ) + @($decision.scope))
        foreach ($candidate in ($candidates.StdOut -split "`r?`n" | Where-Object { $_ -match "^[0-9a-fA-F]{40,64}$" })) {
            $commitObject = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-p", $candidate)).StdOut
            foreach ($parentLine in ($commitObject -split "`r?`n" | Where-Object { $_ -match "^parent [0-9a-fA-F]{40,64}$" })) {
                $parent = ($parentLine -split " ", 2)[1].ToLowerInvariant()
                $parentExists = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-e", "$parent^{commit}") -AllowFailure).ExitCode -eq 0
                if (-not $parentExists) {
                    $missing += [pscustomobject]@{ decisionId = $decision.id; commit = $candidate.ToLowerInvariant(); parent = $parent }
                }
            }
        }
    }
    return @($missing | Sort-Object decisionId, commit, parent -Unique)
}

function Get-TmSyncNonMergeCommitsTouchingScope {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$MergeBase,
        [Parameter(Mandatory)][string]$CanonicalSha,
        [Parameter(Mandatory)][string[]]$Scope
    )

    $result = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList (@(
        "rev-list", "--full-history", "--no-merges", "$MergeBase..$CanonicalSha", "--"
    ) + $Scope)
    if ([string]::IsNullOrWhiteSpace($result.StdOut)) { return @() }
    $verifiedTouches = @()
    foreach ($candidateValue in ($result.StdOut -split "`r?`n" | Where-Object { $_ -match "^[0-9a-fA-F]{40,64}$" })) {
        $candidate = $candidateValue.ToLowerInvariant()
        $commitObject = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-p", $candidate)).StdOut
        $parents = @($commitObject -split "`r?`n" | Where-Object { $_ -match "^parent [0-9a-fA-F]{40,64}$" } | ForEach-Object { ($_ -split " ", 2)[1].ToLowerInvariant() })
        if ($parents.Count -gt 1) {
            throw "--no-merges returned merge commit $candidate while proving adoption scope."
        }
        if ($parents.Count -eq 0) {
            $verifiedTouches += $candidate
            continue
        }
        $parentExists = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-e", "$($parents[0])^{commit}") -AllowFailure).ExitCode -eq 0
        if (-not $parentExists) {
            # A shallow boundary without its declared parent cannot prove absence of a scope touch.
            $verifiedTouches += $candidate
            continue
        }
        $actualDiff = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList (@(
            "diff", "--quiet", $parents[0], $candidate, "--"
        ) + $Scope) -AllowFailure
        if ($actualDiff.ExitCode -eq 1) {
            $verifiedTouches += $candidate
        } elseif ($actualDiff.ExitCode -ne 0) {
            throw "Could not verify parent-to-commit scope diff for $candidate.`n$($actualDiff.StdErr)"
        }
    }
    return $verifiedTouches
}

function Get-TmAdoptionScopeHash {
    param([Parameter(Mandatory)][string[]]$Scope)

    $ordered = [string[]]@($Scope)
    [Array]::Sort($ordered, [StringComparer]::Ordinal)
    $payload = [Text.Encoding]::UTF8.GetBytes(($ordered -join "`n") + "`n")
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($payload)).ToLowerInvariant()
}

function Get-TmAdoptionAuditBody {
    param(
        [Parameter(Mandatory)][string]$DecisionId,
        [Parameter(Mandatory)][string]$UpstreamSha,
        [Parameter(Mandatory)][string]$ScopeHash
    )

    return @(
        "Apply the ledger-reviewed exact upstream scope."
        ""
        "TM-Adoption-Decision: $DecisionId"
        "TM-Adoption-Upstream: $UpstreamSha"
        "TM-Adoption-Scope-SHA256: $ScopeHash"
    ) -join "`n"
}

function Get-TmAdoptionAuditMetadata {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Commit,
        [Parameter(Mandatory)][psobject]$Decision,
        [Parameter(Mandatory)][string]$CurrentUpstreamSha
    )

    $reasons = [Collections.Generic.List[string]]::new()
    $scope = @($Decision.scope | ForEach-Object { [string]$_ })
    $expectedScopeHash = Get-TmAdoptionScopeHash -Scope $scope
    $subject = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("show", "-s", "--format=%s", $Commit)).StdOut.Trim()
    $message = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("show", "-s", "--format=%B", $Commit)).StdOut
    $parsedTrailers = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("interpret-trailers", "--parse") -StandardInput $message).StdOut
    $decisionTrailers = @()
    $upstreamTrailers = @()
    $scopeTrailers = @()
    $decisionKeyCount = 0
    $upstreamKeyCount = 0
    $scopeKeyCount = 0
    foreach ($line in ($parsedTrailers -split "`r?`n")) {
        if ($line -match "^TM-Adoption-Decision:") { $decisionKeyCount++ }
        if ($line -match "^TM-Adoption-Upstream:") { $upstreamKeyCount++ }
        if ($line -match "^TM-Adoption-Scope-SHA256:") { $scopeKeyCount++ }
        $decisionMatch = [regex]::Match($line, "^TM-Adoption-Decision:\s*(.+?)\s*$")
        if ($decisionMatch.Success) { $decisionTrailers += $decisionMatch.Groups[1].Value }
        $upstreamMatch = [regex]::Match($line, "^TM-Adoption-Upstream:\s*([0-9a-fA-F]{40})\s*$")
        if ($upstreamMatch.Success) { $upstreamTrailers += $upstreamMatch.Groups[1].Value.ToLowerInvariant() }
        $scopeMatch = [regex]::Match($line, "^TM-Adoption-Scope-SHA256:\s*([0-9a-fA-F]{64})\s*$")
        if ($scopeMatch.Success) { $scopeTrailers += $scopeMatch.Groups[1].Value.ToLowerInvariant() }
    }
    if ($subject -ne "Adopt upstream for $($Decision.id)") { $reasons.Add("unexpected audit subject") }
    if ($decisionKeyCount -ne 1 -or $decisionTrailers.Count -ne 1 -or $decisionTrailers[0] -ne $Decision.id) { $reasons.Add("decision trailer mismatch") }
    if ($upstreamKeyCount -ne 1 -or $upstreamTrailers.Count -ne 1) { $reasons.Add("recorded upstream trailer missing or duplicated") }
    if ($scopeKeyCount -ne 1 -or $scopeTrailers.Count -ne 1 -or $scopeTrailers[0] -ne $expectedScopeHash) { $reasons.Add("scope hash trailer mismatch") }

    $recordedUpstream = if ($upstreamTrailers.Count -eq 1) { $upstreamTrailers[0] } else { $null }
    $commitObject = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-p", $Commit)).StdOut
    $parents = @($commitObject -split "`r?`n" | Where-Object { $_ -match "^parent [0-9a-fA-F]{40,64}$" } | ForEach-Object { ($_ -split " ", 2)[1].ToLowerInvariant() })
    if ($parents.Count -ne 1) { $reasons.Add("audit commit must have exactly one parent") }
    if ($null -ne $recordedUpstream) {
        $upstreamExists = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-e", "$recordedUpstream^{commit}") -AllowFailure).ExitCode -eq 0
        if (-not $upstreamExists) {
            $reasons.Add("recorded upstream commit is unavailable")
        } else {
            if (-not (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $recordedUpstream -Descendant $CurrentUpstreamSha)) {
                $reasons.Add("recorded upstream is not an ancestor of current upstream")
            }
            if ($parents.Count -eq 1 -and -not (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $recordedUpstream -Descendant $parents[0])) {
                $reasons.Add("audit parent does not contain recorded upstream")
            }
            $tree = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList (@("diff", "--quiet", $recordedUpstream, $Commit, "--") + $scope) -AllowFailure
            if ($tree.ExitCode -eq 1) { $reasons.Add("audit tree does not equal recorded upstream scope") }
            elseif ($tree.ExitCode -ne 0) { throw "Could not validate audit tree for $Commit.`n$($tree.StdErr)" }
        }
    }
    $scopeSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($path in $scope) { [void]$scopeSet.Add($path) }
    $changedPaths = @(Get-TmSyncCommitChangedPaths -RepositoryRoot $RepositoryRoot -Commit $Commit)
    $outsideScope = @($changedPaths | Where-Object { -not $scopeSet.Contains($_) })
    if ($outsideScope.Count -gt 0) { $reasons.Add("audit changes paths outside current ledger scope: $($outsideScope -join ', ')") }
    return [pscustomobject]@{
        commit = $Commit.ToLowerInvariant(); valid = $reasons.Count -eq 0; reasons = @($reasons)
        recordedUpstreamSha = $recordedUpstream; scopeHash = $expectedScopeHash
        parent = if ($parents.Count -eq 1) { $parents[0] } else { $null }
        changedPaths = $changedPaths
    }
}

function Get-TmAdoptionAuditBaseline {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$Decision,
        [Parameter(Mandatory)][string]$CanonicalSha,
        [Parameter(Mandatory)][string]$CurrentUpstreamSha
    )

    $subject = "Adopt upstream for $($Decision.id)"
    $log = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("log", "--format=%H%x09%s", $CanonicalSha)
    $candidates = @()
    $latestValid = $null
    foreach ($line in ($log.StdOut -split "`r?`n")) {
        $parts = $line -split "`t", 2
        if ($parts.Count -ne 2 -or $parts[1] -ne $subject) { continue }
        $metadata = Get-TmAdoptionAuditMetadata -RepositoryRoot $RepositoryRoot -Commit $parts[0] -Decision $Decision -CurrentUpstreamSha $CurrentUpstreamSha
        $candidates += $metadata
        if ($null -eq $latestValid -and $metadata.valid) { $latestValid = $metadata }
    }
    $postAuditTouches = if ($null -ne $latestValid) {
        @(Get-TmSyncNonMergeCommitsTouchingScope -RepositoryRoot $RepositoryRoot -MergeBase $latestValid.commit -CanonicalSha $CanonicalSha -Scope @($Decision.scope))
    } else { @() }
    $tree = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList (@("diff", "--quiet", $CurrentUpstreamSha, $CanonicalSha, "--") + @($Decision.scope)) -AllowFailure
    if ($tree.ExitCode -notin @(0, 1)) { throw "Could not compare current adoption scope.`n$($tree.StdErr)" }
    return [pscustomobject]@{
        scopeHash = Get-TmAdoptionScopeHash -Scope @($Decision.scope)
        latestValidAudit = $latestValid
        auditCandidates = $candidates
        postAuditScopeCommits = $postAuditTouches
        scopeMatchesCurrentUpstream = $tree.ExitCode -eq 0
        applied = $null -ne $latestValid -and $postAuditTouches.Count -eq 0 -and $tree.ExitCode -eq 0
    }
}

function Get-TmAdoptionResolutionProof {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$Decision,
        [Parameter(Mandatory)][string]$CanonicalSha,
        [Parameter(Mandatory)][string]$MergeBase,
        [Parameter(Mandatory)][string]$UpstreamSha
    )

    $scope = @($Decision.scope | ForEach-Object { [string]$_ })
    $scopeSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($path in $scope) { [void]$scopeSet.Add($path) }
    $listedSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($commit in @($Decision.customCommits)) { [void]$listedSet.Add(([string]$commit).ToLowerInvariant()) }
    $commitEvidence = @()
    $initialReasons = [Collections.Generic.List[string]]::new()
    foreach ($commitValue in @($Decision.customCommits)) {
        $commit = ([string]$commitValue).ToLowerInvariant()
        $exists = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-e", "$commit^{commit}") -AllowFailure).ExitCode -eq 0
        $inCanonical = $exists -and (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $commit -Descendant $CanonicalSha)
        $changedPaths = if ($exists) { @(Get-TmSyncCommitChangedPaths -RepositoryRoot $RepositoryRoot -Commit $commit) } else { @() }
        $outsideScope = @($changedPaths | Where-Object { -not $scopeSet.Contains($_) })
        if (-not $inCanonical) { $initialReasons.Add("listed commit $commit is not an ancestor of canonical") }
        if ($changedPaths.Count -eq 0) { $initialReasons.Add("listed commit $commit has no changed paths") }
        if ($outsideScope.Count -gt 0) { $initialReasons.Add("listed commit $commit changes paths outside reviewed scope: $($outsideScope -join ', ')") }
        $commitEvidence += [pscustomobject]@{ sha = $commit; inCanonical = $inCanonical; changedPaths = $changedPaths; outsideScope = $outsideScope }
    }

    $baseline = Get-TmAdoptionAuditBaseline -RepositoryRoot $RepositoryRoot -Decision $Decision -CanonicalSha $CanonicalSha -CurrentUpstreamSha $UpstreamSha
    $canonicalTouches = @()
    $extraTouches = @()
    $missingListedTouches = @()
    $reasons = [Collections.Generic.List[string]]::new()
    $baselineKind = "initial_custom_commits"
    if ($null -ne $baseline.latestValidAudit) {
        $baselineKind = "validated_audit"
        $canonicalTouches = @($baseline.postAuditScopeCommits)
        $extraTouches = @($baseline.postAuditScopeCommits)
        if ($extraTouches.Count -gt 0) { $reasons.Add("ordinary canonical commits touch scope after latest valid audit: $($extraTouches -join ', ')") }
    } else {
        foreach ($reason in $initialReasons) { $reasons.Add($reason) }
        $canonicalTouches = @(Get-TmSyncNonMergeCommitsTouchingScope -RepositoryRoot $RepositoryRoot -MergeBase $MergeBase -CanonicalSha $CanonicalSha -Scope $scope)
        $extraTouches = @($canonicalTouches | Where-Object { -not $listedSet.Contains($_) })
        $touchSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($commit in $canonicalTouches) { [void]$touchSet.Add($commit) }
        $missingListedTouches = @($listedSet | Where-Object { -not $touchSet.Contains($_) })
        if ($extraTouches.Count -gt 0) { $reasons.Add("unreviewed canonical commits touch adoption scope: $($extraTouches -join ', ')") }
        if ($missingListedTouches.Count -gt 0) { $reasons.Add("listed commits are not the exact canonical scope-touch set since merge-base: $($missingListedTouches -join ', ')") }
    }
    $evidence = [pscustomobject]@{
        scopeMatchesUpstream = $baseline.scopeMatchesCurrentUpstream
        evidenceCommit = if ($null -ne $baseline.latestValidAudit) { $baseline.latestValidAudit.commit } else { $null }
        recordedUpstreamSha = if ($null -ne $baseline.latestValidAudit) { $baseline.latestValidAudit.recordedUpstreamSha } else { $null }
        scopeHash = $baseline.scopeHash
        postAuditScopeCommits = @($baseline.postAuditScopeCommits)
        applied = $baseline.applied
    }
    return [pscustomobject]@{
        strategy = $Decision.resolution.strategy; auditVersion = $Decision.resolution.auditVersion
        scope = $scope; scopeHash = $baseline.scopeHash; baselineKind = $baselineKind
        passed = $reasons.Count -eq 0; reasons = @($reasons); listedCommits = $commitEvidence
        canonicalScopeCommits = $canonicalTouches; extraCanonicalScopeCommits = $extraTouches
        missingListedScopeCommits = $missingListedTouches; auditBaseline = $baseline
        resolutionEvidence = $evidence
    }
}

function Get-TmAdoptionOutcomes {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$Ledger,
        [Parameter(Mandatory)][string]$CanonicalSha,
        [Parameter(Mandatory)][string]$UpstreamSha,
        [Parameter(Mandatory)][string]$MergeBase,
        [AllowNull()][scriptblock]$LookupProvider,
        [switch]$NoRemoteLookup
    )

    $gh = if ($NoRemoteLookup) { $null } else { Get-Command gh -ErrorAction SilentlyContinue | Select-Object -First 1 }
    $outcomes = @()
    foreach ($decision in $Ledger.decisions) {
        $resolutionProof = if ($decision.policy -eq "adopt_upstream") {
            Get-TmAdoptionResolutionProof -RepositoryRoot $RepositoryRoot -Decision $decision -CanonicalSha $CanonicalSha -MergeBase $MergeBase -UpstreamSha $UpstreamSha
        } else { $null }
        $outcome = [ordered]@{
            id = $decision.id
            policy = $decision.policy
            lookup = "failed"
            pullRequestState = $null
            mergeSha = $null
            mergeShaInUpstream = $false
            eligible = $false
            blocksCandidate = $false
            outcome = "manual"
            reason = $null
            resolutionProof = $resolutionProof
            resolutionEvidence = $null
            resolutionApplied = $false
            blockBeforeMerge = $false
            customCommitsInCanonical = @()
        }
        if ($null -ne $resolutionProof) {
            $outcome.customCommitsInCanonical = @($resolutionProof.listedCommits | ForEach-Object {
                [pscustomobject]@{ sha = $_.sha; inCanonical = $_.inCanonical }
            })
        } else {
            foreach ($commit in @($decision.customCommits)) {
                $exists = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-e", "$commit^{commit}") -AllowFailure).ExitCode -eq 0
                $inCanonical = $exists -and (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $commit -Descendant $CanonicalSha)
                $outcome.customCommitsInCanonical += [pscustomobject]@{ sha = $commit; inCanonical = $inCanonical }
            }
        }

        if ($NoRemoteLookup) {
            $outcome.blocksCandidate = $true
            $outcome.reason = "Remote PR lookup disabled; fail-closed manual review."
            $outcomes += [pscustomobject]$outcome
            continue
        }
        if ($null -eq $gh -and $null -eq $LookupProvider) {
            $outcome.blocksCandidate = $true
            $outcome.reason = "gh is unavailable; fail-closed manual review."
            $outcomes += [pscustomobject]$outcome
            continue
        }
        try {
            $repository = $decision.officialPullRequest.repository
            $number = [string]$decision.officialPullRequest.number
            if ($null -ne $LookupProvider) {
                $metadata = & $LookupProvider $repository ([int]$number)
                if ($null -eq $metadata) { throw "Adoption lookup provider returned no metadata." }
            } else {
                $lookup = Invoke-TmSyncProcess -FilePath $gh.Source -ArgumentList @(
                    "pr", "view", $number, "--repo", $repository, "--json", "state,mergeCommit"
                ) -StandardInput $null -WorkingDirectory $RepositoryRoot
                if ($lookup.ExitCode -ne 0) {
                    throw "gh pr view failed with exit code $($lookup.ExitCode): $($lookup.StdErr)"
                }
                $metadata = $lookup.StdOut | ConvertFrom-Json -Depth 8
            }
            $outcome.lookup = "succeeded"
            $outcome.pullRequestState = $metadata.state
            if ($null -ne $metadata.mergeCommit) { $outcome.mergeSha = $metadata.mergeCommit.oid }

            if ($decision.policy -eq "manual") {
                $outcome.blocksCandidate = $true
                $outcome.reason = "Ledger policy requires manual review."
            } elseif ($decision.policy -eq "keep_custom_overlay") {
                $outcome.eligible = $true
                $outcome.outcome = "keep_custom_overlay"
                $outcome.reason = "Reviewed ledger policy keeps the custom overlay; no automatic conflict resolution is performed."
            } elseif ($metadata.state -in @("OPEN", "CLOSED")) {
                $outcome.reason = "Official PR is not merged; adoption is not eligible."
            } elseif ($metadata.state -ne "MERGED") {
                $outcome.blocksCandidate = $true
                $outcome.reason = "Official PR returned an unknown state; fail-closed manual review."
            } elseif ([string]::IsNullOrWhiteSpace($outcome.mergeSha)) {
                $outcome.blocksCandidate = $true
                $outcome.reason = "Official PR is merged but has no merge commit; fail-closed manual review."
            } else {
                $mergeExists = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("cat-file", "-e", "$($outcome.mergeSha)^{commit}") -AllowFailure).ExitCode -eq 0
                if ($mergeExists) {
                    $outcome.mergeShaInUpstream = Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $outcome.mergeSha -Descendant $UpstreamSha
                }
                if ($outcome.mergeShaInUpstream) {
                    if ($null -ne $resolutionProof -and $resolutionProof.passed) {
                        $outcome.eligible = $true
                        $outcome.outcome = "adopt_upstream"
                        $outcome.resolutionEvidence = $resolutionProof.resolutionEvidence
                        $outcome.resolutionApplied = $outcome.resolutionEvidence.applied
                        $outcome.reason = if ($outcome.resolutionApplied) {
                            "Official PR is in fetched upstream and exact-scope adoption has tree and audit-commit evidence."
                        } else {
                            "Official PR is in fetched upstream and exact-scope proof passed; a scoped adoption commit is required."
                        }
                    } else {
                        $outcome.blocksCandidate = $true
                        $outcome.blockBeforeMerge = $true
                        $outcome.reason = "Official PR is in fetched upstream, but exact-scope resolution proof failed: $(@($resolutionProof.reasons) -join '; ')"
                    }
                } else {
                    $outcome.blocksCandidate = $true
                    $outcome.reason = "Merged PR commit is not contained in the fetched upstream ref; fail-closed manual review."
                }
            }
        } catch {
            $outcome.lookup = "failed"
            $outcome.eligible = $false
            $outcome.blocksCandidate = $true
            $outcome.outcome = "manual"
            $outcome.reason = "Remote PR lookup failed; fail-closed manual review: $($_.Exception.Message)"
        }
        $outcomes += [pscustomobject]$outcome
    }
    return $outcomes
}

function Get-TmValidationPlan {
    param(
        [Parameter(Mandatory)][psobject]$Ledger,
        [AllowNull()][string[]]$ValidationCommands,
        [switch]$OverrideProvided
    )

    if ($OverrideProvided) {
        $plan = @()
        $index = 0
        foreach ($command in @($ValidationCommands)) {
            $index++
            $plan += [pscustomobject]@{ name = "injected-{0:d2}" -f $index; command = $command }
        }
        return $plan
    }

    $plan = @(
        [pscustomobject]@{ name = "npm-ci"; command = "npm ci" },
        [pscustomobject]@{ name = "make-static"; command = "npm run make:static" },
        [pscustomobject]@{ name = "lint"; command = "npm run lint" },
        [pscustomobject]@{ name = "build"; command = "npm run build" },
        [pscustomobject]@{ name = "build-tests"; command = "npm run build:tests" },
        [pscustomobject]@{ name = "npm-test"; command = "npm test" }
    )
    foreach ($decision in $Ledger.decisions) {
        $index = 0
        foreach ($command in @($decision.regressionTests)) {
            $index++
            $safeId = $decision.id -replace "[^A-Za-z0-9-]", "-"
            $plan += [pscustomobject]@{ name = "ledger-$safeId-{0:d2}" -f $index; command = $command }
        }
    }
    return $plan
}

function Get-TmSavedValidationPlan {
    param([Parameter(Mandatory)][psobject]$State)

    if (-not ($State.PSObject.Properties.Name -contains "validationPlan")) {
        throw "Saved sync state has no validation plan; refusing to Continue with a caller-supplied or default plan."
    }
    $plan = @()
    foreach ($check in @($State.validationPlan)) {
        $name = [string]$check.name
        $command = [string]$check.command
        if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($command)) {
            throw "Saved sync validation plan contains an empty name or command."
        }
        $plan += [pscustomobject]@{ name = $name; command = $command }
    }
    if ($plan.Count -eq 0) {
        throw "Saved sync validation plan is empty."
    }
    return $plan
}

function Invoke-TmValidationPlan {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][object[]]$Plan,
        [Parameter(Mandatory)][string]$RunDirectory
    )

    $checkDirectory = Join-Path $RunDirectory "checks"
    [IO.Directory]::CreateDirectory($checkDirectory) | Out-Null
    $pwsh = Get-Command pwsh -ErrorAction Stop | Select-Object -First 1
    $results = @()
    $blocked = $false
    $position = 0
    foreach ($check in $Plan) {
        $position++
        $safeName = $check.name -replace "[^A-Za-z0-9._-]", "-"
        $logPath = Join-Path $checkDirectory ("{0:d2}-{1}.log" -f $position, $safeName)
        if ($blocked) {
            [IO.File]::WriteAllText($logPath, "SKIPPED after an earlier validation failure.`n", [Text.UTF8Encoding]::new($false))
            $results += [pscustomobject]@{
                name = $check.name; command = $check.command; status = "skipped"; exitCode = $null; durationMs = 0; logPath = $logPath
            }
            continue
        }
        $stopwatch = [Diagnostics.Stopwatch]::StartNew()
        $result = Invoke-TmSyncProcess -FilePath $pwsh.Source -ArgumentList @(
            "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", $check.command
        ) -StandardInput $null -WorkingDirectory $RepositoryRoot
        $stopwatch.Stop()
        $status = if ($result.ExitCode -eq 0) { "passed" } else { "failed" }
        $log = @(
            "name=$($check.name)",
            "command=$($check.command)",
            "exitCode=$($result.ExitCode)",
            "durationMs=$($stopwatch.ElapsedMilliseconds)",
            "",
            "[stdout]",
            $result.StdOut,
            "",
            "[stderr]",
            $result.StdErr
        ) -join "`n"
        [IO.File]::WriteAllText($logPath, $log + "`n", [Text.UTF8Encoding]::new($false))
        $results += [pscustomobject]@{
            name = $check.name
            command = $check.command
            status = $status
            exitCode = $result.ExitCode
            durationMs = $stopwatch.ElapsedMilliseconds
            logPath = $logPath
        }
        if ($result.ExitCode -ne 0) { $blocked = $true }
    }
    return $results
}

function New-TmSyncReport {
    param(
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][string]$Mode,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$Paths
    )

    return [ordered]@{
        schema = "UpstreamSyncReportV1"
        runId = $RunId
        generatedAt = [DateTimeOffset]::UtcNow.ToString("o")
        mode = $Mode
        status = "starting"
        exitCode = $script:TmUpstreamSyncExitCodes.Validation
        repositoryRoot = $RepositoryRoot
        canonical = $null
        upstream = $null
        candidate = $null
        adoptionLedger = $null
        duplicates = @()
        adoptions = @()
        checks = @()
        dirtyAfter = @()
        conflicts = @()
        staleRef = $null
        messages = @()
        reportPaths = [ordered]@{
            json = $Paths.JsonReportPath
            markdown = $Paths.MarkdownReportPath
        }
    }
}

function ConvertTo-TmSyncMarkdown {
    param([Parameter(Mandatory)][psobject]$Report)

    $lines = @(
        "# TM upstream sync report"
        ""
        "- Schema: ``$($Report.schema)``"
        "- Run: ``$($Report.runId)``"
        "- Status: **$($Report.status)**"
        "- Exit code: ``$($Report.exitCode)``"
        "- Repository: ``$($Report.repositoryRoot)``"
    )
    if ($null -ne $Report.canonical) {
        $lines += "- Canonical: ``$($Report.canonical.ref)`` at ``$($Report.canonical.sha)``"
    }
    if ($null -ne $Report.upstream) {
        $lines += "- Upstream: ``$($Report.upstream.ref)`` at ``$($Report.upstream.sha)``"
    }
    if ($null -ne $Report.candidate) {
        $lines += "- Candidate: ``$($Report.candidate.branch)`` at ``$($Report.candidate.sha)`` (pushed: ``$($Report.candidate.pushed)``)"
    }
    $lines += "- Stable-patch duplicates: ``$(@($Report.duplicates).Count)``"
    $lines += "- Adoption decisions evaluated: ``$(@($Report.adoptions).Count)``"
    $lines += "- Dirty paths after validation: ``$(@($Report.dirtyAfter).Count)``"
    if (@($Report.checks).Count -gt 0) {
        $lines += @("", "## Validation", "")
        foreach ($check in $Report.checks) {
            $lines += "- **$($check.status)** ``$($check.name)`` (exit ``$($check.exitCode)``, $($check.durationMs) ms)"
        }
    }
    if (@($Report.conflicts).Count -gt 0) {
        $lines += @("", "## Conflicts", "")
        foreach ($conflict in $Report.conflicts) {
            $lines += "- ``$($conflict.path)``"
        }
    }
    if (@($Report.messages).Count -gt 0) {
        $lines += @("", "## Messages", "")
        foreach ($message in $Report.messages) {
            $lines += "- $message"
        }
    }
    return ($lines -join "`n") + "`n"
}

function Write-TmSyncReport {
    param(
        [Parameter(Mandatory)][System.Collections.IDictionary]$Report,
        [Parameter(Mandatory)][psobject]$Paths
    )

    $Report.generatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    [IO.Directory]::CreateDirectory($Paths.RunDirectory) | Out-Null
    $object = [pscustomobject]$Report
    [IO.File]::WriteAllText($Paths.JsonReportPath, ($object | ConvertTo-Json -Depth 30) + "`n", [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText($Paths.MarkdownReportPath, (ConvertTo-TmSyncMarkdown -Report $object), [Text.UTF8Encoding]::new($false))
    return $object
}

function Write-TmSyncState {
    param(
        [Parameter(Mandatory)][psobject]$State,
        [Parameter(Mandatory)][string]$Path,
        [AllowNull()][scriptblock]$BeforeReplaceTestHook
    )

    $directory = Split-Path -Parent $Path
    [IO.Directory]::CreateDirectory($directory) | Out-Null
    $writeId = [guid]::NewGuid().ToString("N")
    $temporaryPath = Join-Path $directory (".{0}.{1}.tmp" -f ([IO.Path]::GetFileName($Path)), $writeId)
    $stream = $null
    try {
        $payload = [Text.UTF8Encoding]::new($false).GetBytes(($State | ConvertTo-Json -Depth 20) + "`n")
        $stream = [IO.FileStream]::new(
            $temporaryPath,
            [IO.FileMode]::CreateNew,
            [IO.FileAccess]::Write,
            [IO.FileShare]::None,
            4096,
            [IO.FileOptions]::WriteThrough
        )
        $stream.Write($payload, 0, $payload.Length)
        $stream.Flush($true)
        $stream.Dispose()
        $stream = $null
        if ($null -ne $BeforeReplaceTestHook) {
            & $BeforeReplaceTestHook $temporaryPath $Path | Out-Null
        }
        [IO.File]::Move($temporaryPath, $Path, $true)
    } finally {
        if ($null -ne $stream) { $stream.Dispose() }
        if ([IO.File]::Exists($temporaryPath)) {
            [IO.File]::Delete($temporaryPath)
        }
    }
}

function Set-TmSyncConflictReport {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$State,
        [Parameter(Mandatory)][System.Collections.IDictionary]$Report,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Conflicts
    )

    $phaseIndex = [int]$State.nextPhaseIndex
    $remaining = @()
    if ($phaseIndex -lt @($State.phases).Count) {
        $remaining = @($State.phases | Select-Object -Skip $phaseIndex | ForEach-Object { $_.name })
    }
    $Report.status = "conflicts"
    $Report.exitCode = $script:TmUpstreamSyncExitCodes.Conflict
    $Report.candidate = [ordered]@{
        branch = $State.candidateBranch
        sha = Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "HEAD"
        pushed = $false
        remoteRef = "refs/heads/$($State.candidateBranch)"
        currentPhase = $State.currentPhase
        remainingPhases = $remaining
    }
    $Report.conflicts = $Conflicts
    $Report.messages += "Resolve only understood conflicts for phase '$($State.currentPhase)', stage the resolutions, then run -Mode Continue."
}

function Resolve-TmSyncAdoptionConflicts {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$State,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Conflicts
    )

    $resolutionByPath = @{}
    foreach ($conflict in $Conflicts) {
        $matches = @(@($State.adoptionResolutions) | Where-Object {
            $resolution = $_
            @($resolution.scope | Where-Object {
                [string]::Equals([string]$_, [string]$conflict.path, [StringComparison]::Ordinal)
            }).Count -gt 0
        })
        if ($matches.Count -eq 0) {
            return [pscustomobject]@{ ResolvedPaths = @(); RemainingConflicts = $Conflicts }
        }
        if ($matches.Count -gt 1) {
            throw "Conflicted path '$($conflict.path)' is covered by multiple adoption resolutions."
        }
        $resolutionByPath[$conflict.path] = $matches[0]
    }

    $resolvedPaths = @()
    foreach ($conflict in $Conflicts) {
        $resolution = $resolutionByPath[$conflict.path]
        if ($resolution.strategy -ne "restore_upstream_scope" -or $resolution.auditVersion -ne 1 -or
            $resolution.scopeHash -ne (Get-TmAdoptionScopeHash -Scope @($resolution.scope)) -or
            $resolution.upstreamSha -ne $State.upstream.sha) {
            throw "Saved adoption resolution '$($resolution.id)' does not match the recorded upstream contract."
        }
        Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
            "restore", "--source=$($resolution.upstreamSha)", "--staged", "--worktree", "--", $conflict.path
        ) | Out-Null
        $resolvedPaths += $conflict.path
    }
    return [pscustomobject]@{
        ResolvedPaths = $resolvedPaths
        RemainingConflicts = @(Get-TmSyncConflicts -RepositoryRoot $RepositoryRoot)
    }
}

function Test-TmSyncResolutionScopeMatchesUpstream {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$Resolution
    )

    $comparison = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList (@(
        "diff", "--quiet", $Resolution.upstreamSha, "HEAD", "--"
    ) + @($Resolution.scope)) -AllowFailure
    if ($comparison.ExitCode -eq 0) { return $true }
    if ($comparison.ExitCode -eq 1) { return $false }
    throw "Could not verify upstream adoption scope '$($Resolution.id)'.`n$($comparison.StdErr)"
}

function Test-TmSyncResolutionAuditApplied {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$Resolution,
        [switch]$RequireHead
    )

    $decision = [pscustomobject]@{ id = $Resolution.id; scope = @($Resolution.scope) }
    if ($RequireHead) {
        $head = Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "HEAD"
        $metadata = Get-TmAdoptionAuditMetadata -RepositoryRoot $RepositoryRoot -Commit $head -Decision $decision -CurrentUpstreamSha $Resolution.upstreamSha
        return $metadata.valid -and $metadata.recordedUpstreamSha -eq $Resolution.upstreamSha
    }
    $head = Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "HEAD"
    $baseline = Get-TmAdoptionAuditBaseline -RepositoryRoot $RepositoryRoot -Decision $decision -CanonicalSha $head -CurrentUpstreamSha $Resolution.upstreamSha
    return $baseline.applied -and $baseline.latestValidAudit.recordedUpstreamSha -eq $Resolution.upstreamSha
}

function Invoke-TmSyncAdoptionResolutions {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$State,
        [Parameter(Mandatory)][System.Collections.IDictionary]$Report,
        [Parameter(Mandatory)][string]$StatePath
    )

    $resolutions = @($State.adoptionResolutions)
    if ($resolutions.Count -eq 0) { return $true }
    $nextIndex = [int]$State.nextResolutionIndex
    if ($nextIndex -lt 0 -or $nextIndex -gt $resolutions.Count) {
        throw "Saved adoption resolution index is out of range."
    }

    for ($completedIndex = 0; $completedIndex -lt $nextIndex; $completedIndex++) {
        $completed = $resolutions[$completedIndex]
        if (-not (Test-TmSyncResolutionAuditApplied -RepositoryRoot $RepositoryRoot -Resolution $completed)) {
            throw "Saved adoption resolution '$($completed.id)' is marked complete but lacks exact valid audit evidence."
        }
        $completedOutcome = @($Report.adoptions | Where-Object { $_.id -eq $completed.id } | Select-Object -First 1)
        if ($completedOutcome.Count -eq 1) { $completedOutcome[0].resolutionApplied = $true }
    }

    while ($nextIndex -lt $resolutions.Count) {
        $resolution = $resolutions[$nextIndex]
        if (-not [string]::IsNullOrWhiteSpace([string]$State.currentResolution) -and $State.currentResolution -ne $resolution.id) {
            throw "Saved current adoption resolution '$($State.currentResolution)' does not match index $nextIndex ('$($resolution.id)')."
        }
        $outcome = @($Report.adoptions | Where-Object { $_.id -eq $resolution.id } | Select-Object -First 1)
        if ($outcome.Count -ne 1 -or $outcome[0].eligible -ne $true -or $outcome[0].outcome -ne "adopt_upstream") {
            $Report.status = "adoption-blocked"
            $Report.exitCode = $script:TmUpstreamSyncExitCodes.Conflict
            $Report.messages += "Saved adoption resolution '$($resolution.id)' is no longer eligible under current fail-closed metadata."
            return $false
        }
        $expectedScope = @($outcome[0].resolutionProof.scope | Sort-Object)
        $savedScope = @($resolution.scope | Sort-Object)
        if ($resolution.strategy -ne "restore_upstream_scope" -or $resolution.upstreamSha -ne $State.upstream.sha -or
            $resolution.auditVersion -ne 1 -or $resolution.scopeHash -ne $outcome[0].resolutionProof.scopeHash -or
            ($expectedScope -join "`0") -cne ($savedScope -join "`0") -or
            $resolution.commitSubject -ne "Adopt upstream for $($resolution.id)" -or
            $resolution.commitBody -ne (Get-TmAdoptionAuditBody -DecisionId $resolution.id -UpstreamSha $resolution.upstreamSha -ScopeHash $resolution.scopeHash)) {
            throw "Saved adoption resolution '$($resolution.id)' differs from the ledger-reviewed exact-scope contract."
        }

        $State.currentResolution = $resolution.id
        Write-TmSyncState -State $State -Path $StatePath
        $alreadyCommitted = Test-TmSyncResolutionAuditApplied -RepositoryRoot $RepositoryRoot -Resolution $resolution -RequireHead
        if (-not $alreadyCommitted) {
            $scopeSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
            foreach ($path in @($resolution.scope)) { [void]$scopeSet.Add([string]$path) }
            $dirtyBefore = @(Get-TmSyncDirtyPaths -RepositoryRoot $RepositoryRoot)
            $outsideDirty = @($dirtyBefore | Where-Object { -not $scopeSet.Contains($_) })
            if ($outsideDirty.Count -gt 0) {
                throw "Adoption resolution '$($resolution.id)' found dirty paths outside reviewed scope: $($outsideDirty -join ', ')"
            }
            if (@(Get-TmSyncConflicts -RepositoryRoot $RepositoryRoot).Count -gt 0) {
                throw "Adoption resolution '$($resolution.id)' cannot run with unmerged paths."
            }
            Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList (@(
                "restore", "--source=$($resolution.upstreamSha)", "--staged", "--worktree", "--"
            ) + @($resolution.scope)) | Out-Null
            $stagedOutput = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("diff", "--cached", "--name-only", "-z")).StdOut
            $stagedPaths = @($stagedOutput -split "`0" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            $outsideScope = @($stagedPaths | Where-Object { -not $scopeSet.Contains($_) })
            if ($outsideScope.Count -gt 0) {
                throw "Adoption resolution '$($resolution.id)' staged paths outside reviewed scope: $($outsideScope -join ', ')"
            }
            Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
                "-c", "commit.gpgSign=false", "commit", "--allow-empty", "-m", $resolution.commitSubject, "-m", $resolution.commitBody
            ) | Out-Null
        }
        if (-not (Test-TmSyncResolutionAuditApplied -RepositoryRoot $RepositoryRoot -Resolution $resolution -RequireHead)) {
            throw "Adoption resolution '$($resolution.id)' did not produce exact structured audit evidence."
        }
        $outcome[0].resolutionApplied = $true
        $State.nextResolutionIndex = $nextIndex + 1
        $State.currentResolution = $null
        Write-TmSyncState -State $State -Path $StatePath
        $nextIndex++
    }
    return $true
}

function Invoke-TmSyncMergePhases {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$State,
        [Parameter(Mandatory)][System.Collections.IDictionary]$Report,
        [Parameter(Mandatory)][string]$StatePath
    )

    while ([int]$State.nextPhaseIndex -lt @($State.phases).Count) {
        $phaseIndex = [int]$State.nextPhaseIndex
        $phase = @($State.phases)[$phaseIndex]
        $head = Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "HEAD"
        if (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $phase.sha -Descendant $head) {
            $State.nextPhaseIndex = $phaseIndex + 1
            $State.currentPhase = $null
            Write-TmSyncState -State $State -Path $StatePath
            continue
        }

        $State.currentPhase = $phase.name
        Write-TmSyncState -State $State -Path $StatePath
        $merge = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
            "-c", "rerere.enabled=true", "-c", "rerere.autoupdate=false",
            "merge", "--no-ff", "--no-commit", $phase.sha
        ) -AllowFailure
        if ($merge.ExitCode -ne 0) {
            $conflicts = @(Get-TmSyncConflicts -RepositoryRoot $RepositoryRoot)
            $autoResolved = @()
            if ($conflicts.Count -gt 0 -and $phase.name -eq "upstream" -and @($State.adoptionResolutions).Count -gt 0) {
                $resolutionResult = Resolve-TmSyncAdoptionConflicts -RepositoryRoot $RepositoryRoot -State $State -Conflicts $conflicts
                $autoResolved = @($resolutionResult.ResolvedPaths)
                $conflicts = @($resolutionResult.RemainingConflicts)
                if ($autoResolved.Count -gt 0) {
                    $Report.messages += "Resolved all upstream-phase conflicts from ledger-reviewed exact upstream scopes: $($autoResolved -join ', ')"
                }
            }
            if ($conflicts.Count -gt 0) {
                Set-TmSyncConflictReport -RepositoryRoot $RepositoryRoot -State $State -Report $Report -Conflicts $conflicts
                return $false
            }
            if ($autoResolved.Count -eq 0) {
                throw "Merge phase '$($phase.name)' failed without unmerged paths.`n$($merge.StdOut)`n$($merge.StdErr)"
            }
        }
        $mergeHead = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("rev-parse", "--verify", "MERGE_HEAD") -AllowFailure
        if ($mergeHead.ExitCode -eq 0) {
            Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
                "-c", "commit.gpgSign=false", "commit", "-m", $phase.commitMessage
            ) | Out-Null
        } elseif (-not (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $phase.sha -Descendant (Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "HEAD"))) {
            throw "Merge phase '$($phase.name)' completed without MERGE_HEAD and without incorporating its target."
        }
        $State.nextPhaseIndex = $phaseIndex + 1
        $State.currentPhase = $null
        Write-TmSyncState -State $State -Path $StatePath
    }
    return $true
}

function Complete-TmSyncCandidate {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][psobject]$State,
        [Parameter(Mandatory)][System.Collections.IDictionary]$Report,
        [Parameter(Mandatory)][string]$StatePath,
        [Parameter(Mandatory)][object[]]$ValidationPlan,
        [Parameter(Mandatory)][psobject]$Paths,
        [AllowNull()][scriptblock]$BeforePushTestHook,
        [AllowNull()][scriptblock]$AfterPushTestHook,
        [switch]$PushCandidate
    )

    $candidateSha = Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "HEAD"
    if (-not (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $State.canonical.sha -Descendant $candidateSha)) {
        throw "Candidate no longer contains the recorded canonical commit $($State.canonical.sha)."
    }
    if (-not (Test-TmSyncAncestor -RepositoryRoot $RepositoryRoot -Ancestor $State.upstream.sha -Descendant $candidateSha)) {
        throw "Candidate no longer contains the recorded upstream commit $($State.upstream.sha)."
    }
    $status = (Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @("status", "--porcelain=v1", "--untracked-files=all")).StdOut
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw "Candidate checkout is not clean after commit.`n$status"
    }

    $Report.candidate = [ordered]@{
        branch = $State.candidateBranch
        sha = $candidateSha
        pushed = $false
        remoteRef = "refs/heads/$($State.candidateBranch)"
        remoteSha = $null
        remoteVerified = $false
    }

    $Report.checks = @(Invoke-TmValidationPlan -RepositoryRoot $RepositoryRoot -Plan $ValidationPlan -RunDirectory $Paths.RunDirectory)
    $Report.dirtyAfter = @(Get-TmSyncDirtyPaths -RepositoryRoot $RepositoryRoot)
    $headAfter = Get-TmSyncRefSha -RepositoryRoot $RepositoryRoot -Ref "HEAD"
    $failedChecks = @($Report.checks | Where-Object { $_.status -eq "failed" })
    if ($failedChecks.Count -gt 0) {
        $Report.status = "validation-failed"
        $Report.exitCode = $script:TmUpstreamSyncExitCodes.Validation
        $Report.messages += "Candidate validation failed; candidate was preserved and push was skipped."
        return
    }
    if (@($Report.dirtyAfter).Count -gt 0) {
        $Report.status = "validation-failed"
        $Report.exitCode = $script:TmUpstreamSyncExitCodes.Validation
        $Report.messages += "Validation left the candidate checkout dirty; candidate was preserved and push was skipped: $($Report.dirtyAfter -join ', ')"
        return
    }
    if ($headAfter -ne $candidateSha) {
        $Report.status = "validation-failed"
        $Report.exitCode = $script:TmUpstreamSyncExitCodes.Validation
        $Report.messages += "Validation changed HEAD; candidate was preserved and push was skipped."
        return
    }
    $unappliedAdoptions = @($Report.adoptions | Where-Object {
        $_.eligible -eq $true -and $_.outcome -eq "adopt_upstream" -and $_.resolutionApplied -ne $true
    })
    if ($unappliedAdoptions.Count -gt 0) {
        $Report.status = "adoption-blocked"
        $Report.exitCode = $script:TmUpstreamSyncExitCodes.Conflict
        $Report.messages += "Candidate still lacks required ledger-reviewed adoption commits: $($unappliedAdoptions.id -join ', ')"
        return
    }
    $blockingAdoptions = @($Report.adoptions | Where-Object { $_.blocksCandidate -eq $true })
    if ($blockingAdoptions.Count -gt 0) {
        $Report.status = "adoption-blocked"
        $Report.exitCode = $script:TmUpstreamSyncExitCodes.Conflict
        $Report.messages += "Adoption metadata requires manual review; candidate was preserved and push was skipped: $($blockingAdoptions.id -join ', ')"
        return
    }

    if ($PushCandidate) {
        $freshness = Test-TmSyncRefsFresh -RepositoryRoot $RepositoryRoot -State $State
        if (-not $freshness.IsFresh) {
            $Report.status = "stale-ref"
            $Report.exitCode = $script:TmUpstreamSyncExitCodes.StaleRef
            $Report.staleRef = $freshness
            $Report.messages += "Remote canonical or upstream moved after the candidate baseline was captured; normal push was skipped."
            return
        }
        if ($null -ne $BeforePushTestHook) {
            & $BeforePushTestHook $RepositoryRoot $State.candidateBranch $candidateSha | Out-Null
        }
        $push = Invoke-TmSyncGit -RepositoryRoot $RepositoryRoot -ArgumentList @(
            "push",
            $State.canonical.remote,
            "${candidateSha}:refs/heads/$($State.candidateBranch)"
        ) -AllowFailure
        if ($push.ExitCode -ne 0) {
            throw "Normal candidate push failed (no force was attempted).`n$($push.StdOut)`n$($push.StdErr)"
        }
        if ($null -ne $AfterPushTestHook) {
            & $AfterPushTestHook $RepositoryRoot $State.candidateBranch $candidateSha | Out-Null
        }
        $remoteCandidateSha = Get-TmSyncRemoteHeadSha -RepositoryRoot $RepositoryRoot -Remote $State.canonical.remote -Branch $State.candidateBranch
        $Report.candidate.remoteSha = $remoteCandidateSha
        if ($remoteCandidateSha -ne $candidateSha) {
            throw "Remote candidate verification failed: expected validated SHA $candidateSha, got $remoteCandidateSha."
        }
        $Report.candidate.remoteVerified = $true
        $Report.candidate.pushed = $true
        $Report.status = "candidate-pushed"
    } else {
        $Report.status = "candidate-ready"
    }
    $Report.exitCode = $script:TmUpstreamSyncExitCodes.Success
    Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
}

function Invoke-TmUpstreamSync {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [ValidateSet("Prepare", "Continue")][string]$Mode = "Prepare",
        [string]$OriginRemote = "origin",
        [string]$CanonicalBranch = "main",
        [string]$UpstreamRemote = "upstream",
        [string]$UpstreamBranch = "main",
        [string]$CandidateBranch,
        [Parameter(Mandatory)][string]$ReportRoot,
        [Parameter(Mandatory)][string]$AdoptionLedgerPath,
        [AllowNull()][string[]]$ValidationCommands,
        [AllowNull()][scriptblock]$AdoptionLookupProvider,
        [AllowNull()][scriptblock]$BeforePushTestHook,
        [AllowNull()][scriptblock]$AfterPushTestHook,
        [switch]$AllowNonReleaseCheckout,
        [switch]$NoAdoptionRemoteLookup,
        [switch]$NoFetch,
        [switch]$PushCandidate
    )

    $validationOverrideProvided = $PSBoundParameters.ContainsKey("ValidationCommands")
    $runId = "{0}-{1}" -f ([DateTimeOffset]::UtcNow.ToString("yyyyMMddTHHmmssfffZ")), ([guid]::NewGuid().ToString("N").Substring(0, 8))
    $resolvedRepository = [IO.Path]::GetFullPath($RepositoryRoot)
    $paths = Get-TmUpstreamSyncPaths -RepositoryRoot $resolvedRepository -ReportRoot $ReportRoot -RunId $runId
    $report = New-TmSyncReport -RunId $runId -Mode $Mode -RepositoryRoot $resolvedRepository -Paths $paths
    $lock = $null

    try {
        $lock = Enter-TmUpstreamSyncLock -LockPath $paths.LockPath
        if ($null -eq $lock) {
            $report.status = "lock-busy"
            $report.exitCode = $script:TmUpstreamSyncExitCodes.LockBusy
            $report.messages += "Another upstream sync run holds the repository lock."
            return Write-TmSyncReport -Report $report -Paths $paths
        }

        $resolvedRepository = Resolve-TmSyncRepositoryRoot -RepositoryRoot $resolvedRepository
        Assert-TmSyncReleaseCheckoutIdentity -RepositoryRoot $resolvedRepository -AllowNonReleaseCheckout:$AllowNonReleaseCheckout
        $report.repositoryRoot = $resolvedRepository
        $ledger = Read-TmAdoptionLedger -Path $AdoptionLedgerPath
        $report.adoptionLedger = [ordered]@{
            schema = $ledger.Ledger.schema
            schemaVersion = $ledger.Ledger.schemaVersion
            sha256 = $ledger.Sha256
            decisionIds = @($ledger.Ledger.decisions | ForEach-Object { $_.id })
        }
        $validationPlan = $null

        if ($Mode -eq "Prepare") {
            if (Test-Path -LiteralPath $paths.StatePath) {
                throw "A saved sync state already exists; use -Mode Continue so its immutable ledger and validation contract cannot be replaced: $($paths.StatePath)"
            }
            $validationPlan = @(Get-TmValidationPlan -Ledger $ledger.Ledger -ValidationCommands $ValidationCommands -OverrideProvided:$validationOverrideProvided)
            if ($validationPlan.Count -eq 0) {
                throw "Validation plan is empty; at least one command is required before a candidate can become ready."
            }
            Assert-TmSyncCheckoutClean -RepositoryRoot $resolvedRepository
            if (-not $NoFetch) {
                Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @(
                    "fetch", "--prune", "--no-tags", $OriginRemote,
                    "+refs/heads/$CanonicalBranch`:refs/remotes/$OriginRemote/$CanonicalBranch"
                ) | Out-Null
                $shallow = (Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("rev-parse", "--is-shallow-repository")).StdOut.Trim()
                if ($shallow -eq "true") {
                    Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @(
                        "fetch", "--unshallow", "--no-tags", $OriginRemote,
                        "+refs/heads/$CanonicalBranch`:refs/remotes/$OriginRemote/$CanonicalBranch"
                    ) | Out-Null
                    $shallowAfter = (Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("rev-parse", "--is-shallow-repository")).StdOut.Trim()
                    if ($shallowAfter -ne "false") {
                        throw "Canonical history remained shallow after explicit unshallow fetch; adoption proof cannot continue safely."
                    }
                    $report.messages += "Fetched complete canonical history because adoption proof cannot trust artificial shallow roots."
                }
                Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @(
                    "fetch", "--prune", "--no-tags", $UpstreamRemote,
                    "+refs/heads/$UpstreamBranch`:refs/remotes/$UpstreamRemote/$UpstreamBranch"
                ) | Out-Null
            } else {
                $shallow = (Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("rev-parse", "--is-shallow-repository")).StdOut.Trim()
                if ($shallow -eq "true") {
                    throw "-NoFetch cannot prove adoption history from a shallow repository; run Prepare with fetch enabled to unshallow safely."
                }
            }

            $canonicalRef = "refs/remotes/$OriginRemote/$CanonicalBranch"
            $upstreamRef = "refs/remotes/$UpstreamRemote/$UpstreamBranch"
            $canonicalSha = Get-TmSyncRefSha -RepositoryRoot $resolvedRepository -Ref $canonicalRef
            $upstreamSha = Get-TmSyncRefSha -RepositoryRoot $resolvedRepository -Ref $upstreamRef
            $mergeBase = (Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("merge-base", $canonicalSha, $upstreamSha)).StdOut.Trim()
            $missingProofParents = @(Get-TmSyncMissingAdoptionParentObjects -RepositoryRoot $resolvedRepository -Ledger $ledger.Ledger -MergeBase $mergeBase -CanonicalSha $canonicalSha)
            if ($missingProofParents.Count -gt 0) {
                throw "Commit parents required for adoption proof are unavailable even after full-history checks: $($missingProofParents.parent -join ', ')"
            }
            $report.canonical = [ordered]@{ remote = $OriginRemote; branch = $CanonicalBranch; ref = $canonicalRef; sha = $canonicalSha }
            $report.upstream = [ordered]@{ remote = $UpstreamRemote; branch = $UpstreamBranch; ref = $upstreamRef; sha = $upstreamSha; mergeBase = $mergeBase }
            $report.adoptions = @(Get-TmAdoptionOutcomes -RepositoryRoot $resolvedRepository -Ledger $ledger.Ledger -CanonicalSha $canonicalSha -UpstreamSha $upstreamSha -MergeBase $mergeBase -LookupProvider $AdoptionLookupProvider -NoRemoteLookup:$NoAdoptionRemoteLookup)

            $unsafeResolutionProofs = @($report.adoptions | Where-Object { $_.blockBeforeMerge -eq $true })
            if ($unsafeResolutionProofs.Count -gt 0) {
                $report.status = "adoption-blocked"
                $report.exitCode = $script:TmUpstreamSyncExitCodes.Conflict
                $report.messages += "Ledger-reviewed upstream adoption proof failed before candidate mutation: $($unsafeResolutionProofs.id -join ', ')"
                return Write-TmSyncReport -Report $report -Paths $paths
            }
            $unappliedAdoptions = @($report.adoptions | Where-Object {
                $_.eligible -eq $true -and $_.outcome -eq "adopt_upstream" -and $_.resolutionApplied -ne $true
            })
            $relevantAdoptionBlocks = @($report.adoptions | Where-Object { $_.blocksCandidate -eq $true })
            if (Test-TmSyncAncestor -RepositoryRoot $resolvedRepository -Ancestor $upstreamSha -Descendant $canonicalSha) {
                if ($relevantAdoptionBlocks.Count -gt 0) {
                    $report.status = "adoption-blocked"
                    $report.exitCode = $script:TmUpstreamSyncExitCodes.Conflict
                    $report.messages += "Canonical contains upstream, but active custom adoption scope lacks safe resolution evidence: $($relevantAdoptionBlocks.id -join ', ')"
                    return Write-TmSyncReport -Report $report -Paths $paths
                }
                if ($unappliedAdoptions.Count -eq 0) {
                    $report.status = "no-op"
                    $report.exitCode = $script:TmUpstreamSyncExitCodes.Success
                    $report.messages += "Canonical already contains upstream and every applicable adoption has exact tree plus audit-commit evidence."
                    return Write-TmSyncReport -Report $report -Paths $paths
                }
                $report.messages += "Canonical contains upstream, but scoped adoption still requires an additive candidate commit: $($unappliedAdoptions.id -join ', ')"
            }
            $report.duplicates = @(Find-TmRangeDuplicatePatches -RepositoryRoot $resolvedRepository -MergeBase $mergeBase -CanonicalSha $canonicalSha -UpstreamSha $upstreamSha)

            $candidateResolution = Resolve-TmSyncCandidateBranch -RepositoryRoot $resolvedRepository -OriginRemote $OriginRemote -RequestedBranch $CandidateBranch -NoFetch:$NoFetch
            $CandidateBranch = $candidateResolution.Branch
            if ($null -ne $candidateResolution.LocalSha) {
                Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("switch", $CandidateBranch) | Out-Null
                if ($null -ne $candidateResolution.RemoteSha -and $candidateResolution.LocalSha -ne $candidateResolution.RemoteSha) {
                    if (Test-TmSyncAncestor -RepositoryRoot $resolvedRepository -Ancestor $candidateResolution.LocalSha -Descendant $candidateResolution.RemoteSha) {
                        Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("merge", "--ff-only", $candidateResolution.RemoteSha) | Out-Null
                    } elseif (-not (Test-TmSyncAncestor -RepositoryRoot $resolvedRepository -Ancestor $candidateResolution.RemoteSha -Descendant $candidateResolution.LocalSha)) {
                        throw "Local and remote candidate histories diverged for '$CandidateBranch'; refusing to choose or rewrite either history."
                    }
                }
            } elseif ($null -ne $candidateResolution.RemoteSha) {
                Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("switch", "--create", $CandidateBranch, $candidateResolution.RemoteSha) | Out-Null
            } else {
                Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("switch", "--create", $CandidateBranch, $canonicalSha) | Out-Null
            }

            $candidateBaseSha = Get-TmSyncRefSha -RepositoryRoot $resolvedRepository -Ref "HEAD"
            $phases = @()
            if (-not (Test-TmSyncAncestor -RepositoryRoot $resolvedRepository -Ancestor $canonicalSha -Descendant $candidateBaseSha)) {
                $phases += [pscustomobject]@{
                    name = "canonical"
                    sha = $canonicalSha
                    commitMessage = "Merge $OriginRemote/$CanonicalBranch into upstream sync candidate"
                }
            }
            if (-not (Test-TmSyncAncestor -RepositoryRoot $resolvedRepository -Ancestor $upstreamSha -Descendant $candidateBaseSha)) {
                $phases += [pscustomobject]@{
                    name = "upstream"
                    sha = $upstreamSha
                    commitMessage = "Merge $UpstreamRemote/$UpstreamBranch into upstream sync candidate"
                }
            }

            $adoptionResolutions = @($report.adoptions | Where-Object {
                $_.eligible -eq $true -and $_.outcome -eq "adopt_upstream" -and $_.resolutionApplied -ne $true
            } | ForEach-Object {
                [pscustomobject]@{
                    id = $_.id
                    strategy = $_.resolutionProof.strategy
                    auditVersion = $_.resolutionProof.auditVersion
                    scope = @($_.resolutionProof.scope)
                    scopeHash = $_.resolutionProof.scopeHash
                    upstreamSha = $upstreamSha
                    commitSubject = "Adopt upstream for $($_.id)"
                    commitBody = Get-TmAdoptionAuditBody -DecisionId $_.id -UpstreamSha $upstreamSha -ScopeHash $_.resolutionProof.scopeHash
                }
            })

            $state = [pscustomobject]@{
                schema = "TmUpstreamSyncStateV2"
                createdAt = [DateTimeOffset]::UtcNow.ToString("o")
                candidateBranch = $CandidateBranch
                adoptionLedgerSha256 = $ledger.Sha256
                validationPlan = @($validationPlan | ForEach-Object { [pscustomobject]@{ name = $_.name; command = $_.command } })
                canonical = [pscustomobject]@{ remote = $OriginRemote; branch = $CanonicalBranch; ref = $canonicalRef; sha = $canonicalSha }
                upstream = [pscustomobject]@{ remote = $UpstreamRemote; branch = $UpstreamBranch; ref = $upstreamRef; sha = $upstreamSha }
                phases = $phases
                nextPhaseIndex = 0
                currentPhase = $null
                adoptionResolutions = $adoptionResolutions
                nextResolutionIndex = 0
                currentResolution = $null
            }
            Write-TmSyncState -State $state -Path $paths.StatePath
            $phasesComplete = Invoke-TmSyncMergePhases -RepositoryRoot $resolvedRepository -State $state -Report $report -StatePath $paths.StatePath
            if (-not $phasesComplete) {
                return Write-TmSyncReport -Report $report -Paths $paths
            }
            $resolutionsComplete = Invoke-TmSyncAdoptionResolutions -RepositoryRoot $resolvedRepository -State $state -Report $report -StatePath $paths.StatePath
            if (-not $resolutionsComplete) {
                return Write-TmSyncReport -Report $report -Paths $paths
            }
            Complete-TmSyncCandidate -RepositoryRoot $resolvedRepository -State $state -Report $report -StatePath $paths.StatePath -ValidationPlan $validationPlan -Paths $paths -BeforePushTestHook $BeforePushTestHook -AfterPushTestHook $AfterPushTestHook -PushCandidate:$PushCandidate
            return Write-TmSyncReport -Report $report -Paths $paths
        }

        if (-not (Test-Path -LiteralPath $paths.StatePath)) {
            throw "No saved sync state exists for Continue: $($paths.StatePath)"
        }
        $state = Get-Content -LiteralPath $paths.StatePath -Raw | ConvertFrom-Json -Depth 12
        if ($state.schema -ne "TmUpstreamSyncStateV2") { throw "Unsupported sync state schema: $($state.schema)" }
        if (-not ($state.PSObject.Properties.Name -contains "adoptionLedgerSha256") -or
            -not [string]::Equals([string]$state.adoptionLedgerSha256, [string]$ledger.Sha256, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Adoption ledger changed after Prepare; refusing to Continue with a different decision contract. Saved '$($state.adoptionLedgerSha256)', current '$($ledger.Sha256)'."
        }
        $validationPlan = @(Get-TmSavedValidationPlan -State $state)
        foreach ($requiredProperty in @("adoptionResolutions", "nextResolutionIndex", "currentResolution")) {
            if (-not ($state.PSObject.Properties.Name -contains $requiredProperty)) {
                throw "Saved sync state lacks required adoption field '$requiredProperty'."
            }
        }
        if ($validationOverrideProvided) {
            $report.messages += "Continue ignored caller-supplied validation commands and used the exact plan saved by Prepare."
        }
        $report.canonical = [ordered]@{ remote = $state.canonical.remote; branch = $state.canonical.branch; ref = $state.canonical.ref; sha = $state.canonical.sha }
        $mergeBase = (Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("merge-base", $state.canonical.sha, $state.upstream.sha)).StdOut.Trim()
        $report.upstream = [ordered]@{ remote = $state.upstream.remote; branch = $state.upstream.branch; ref = $state.upstream.ref; sha = $state.upstream.sha; mergeBase = $mergeBase }
        $report.duplicates = @(Find-TmRangeDuplicatePatches -RepositoryRoot $resolvedRepository -MergeBase $mergeBase -CanonicalSha $state.canonical.sha -UpstreamSha $state.upstream.sha)
        $report.adoptions = @(Get-TmAdoptionOutcomes -RepositoryRoot $resolvedRepository -Ledger $ledger.Ledger -CanonicalSha $state.canonical.sha -UpstreamSha $state.upstream.sha -MergeBase $mergeBase -LookupProvider $AdoptionLookupProvider -NoRemoteLookup:$NoAdoptionRemoteLookup)
        $currentBranch = Get-TmSyncCurrentBranch -RepositoryRoot $resolvedRepository
        if ($currentBranch -ne $state.candidateBranch) {
            throw "Continue must run on saved candidate branch '$($state.candidateBranch)', current branch is '$currentBranch'."
        }
        $conflicts = @(Get-TmSyncConflicts -RepositoryRoot $resolvedRepository)
        if ($conflicts.Count -gt 0) {
            if ([string]::IsNullOrWhiteSpace($state.currentPhase)) {
                throw "Unmerged paths exist but saved state has no current merge phase."
            }
            Set-TmSyncConflictReport -RepositoryRoot $resolvedRepository -State $state -Report $report -Conflicts $conflicts
            $report.messages += "Unmerged paths remain; Continue did not commit or push."
            return Write-TmSyncReport -Report $report -Paths $paths
        }

        $mergeHead = Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("rev-parse", "--verify", "MERGE_HEAD") -AllowFailure
        if (-not [string]::IsNullOrWhiteSpace($state.currentPhase)) {
            $phaseIndex = [int]$state.nextPhaseIndex
            if ($phaseIndex -ge @($state.phases).Count) { throw "Saved current phase index is out of range." }
            $phase = @($state.phases)[$phaseIndex]
            if ($phase.name -ne $state.currentPhase) { throw "Saved current phase does not match nextPhaseIndex." }
            $phaseCompleted = $false
            if ($mergeHead.ExitCode -eq 0) {
                if ($mergeHead.StdOut.Trim() -ne $phase.sha) {
                    throw "MERGE_HEAD does not match the recorded '$($phase.name)' phase target."
                }
                $unstaged = Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @("diff", "--quiet") -AllowFailure
                if ($unstaged.ExitCode -ne 0) {
                    Set-TmSyncConflictReport -RepositoryRoot $resolvedRepository -State $state -Report $report -Conflicts @()
                    $report.messages += "Resolved files still have unstaged changes; stage them before Continue."
                    return Write-TmSyncReport -Report $report -Paths $paths
                }
                Invoke-TmSyncGit -RepositoryRoot $resolvedRepository -ArgumentList @(
                    "-c", "commit.gpgSign=false", "commit", "-m", $phase.commitMessage
                ) | Out-Null
                $phaseCompleted = $true
            } else {
                $head = Get-TmSyncRefSha -RepositoryRoot $resolvedRepository -Ref "HEAD"
                if (Test-TmSyncAncestor -RepositoryRoot $resolvedRepository -Ancestor $phase.sha -Descendant $head) {
                    $phaseCompleted = $true
                } else {
                    $dirtyPaths = @(Get-TmSyncDirtyPaths -RepositoryRoot $resolvedRepository)
                    if ($dirtyPaths.Count -gt 0) {
                        throw "Saved phase '$($phase.name)' has no MERGE_HEAD but the checkout is dirty; refusing an ambiguous retry: $($dirtyPaths -join ', ')"
                    }
                    $state.currentPhase = $null
                    Write-TmSyncState -State $state -Path $paths.StatePath
                }
            }
            if ($phaseCompleted) {
                $state.nextPhaseIndex = $phaseIndex + 1
                $state.currentPhase = $null
                Write-TmSyncState -State $state -Path $paths.StatePath
            }
        } else {
            if ($mergeHead.ExitCode -eq 0) { throw "MERGE_HEAD exists but saved state has no current merge phase." }
        }
        $phasesComplete = Invoke-TmSyncMergePhases -RepositoryRoot $resolvedRepository -State $state -Report $report -StatePath $paths.StatePath
        if (-not $phasesComplete) { return Write-TmSyncReport -Report $report -Paths $paths }
        $resolutionsComplete = Invoke-TmSyncAdoptionResolutions -RepositoryRoot $resolvedRepository -State $state -Report $report -StatePath $paths.StatePath
        if (-not $resolutionsComplete) { return Write-TmSyncReport -Report $report -Paths $paths }
        Complete-TmSyncCandidate -RepositoryRoot $resolvedRepository -State $state -Report $report -StatePath $paths.StatePath -ValidationPlan $validationPlan -Paths $paths -BeforePushTestHook $BeforePushTestHook -AfterPushTestHook $AfterPushTestHook -PushCandidate:$PushCandidate
        return Write-TmSyncReport -Report $report -Paths $paths
    } catch {
        $report.status = "validation-failed"
        $report.exitCode = $script:TmUpstreamSyncExitCodes.Validation
        $report.messages += $_.Exception.Message
        return Write-TmSyncReport -Report $report -Paths $paths
    } finally {
        if ($null -ne $lock) { $lock.Dispose() }
    }
}
