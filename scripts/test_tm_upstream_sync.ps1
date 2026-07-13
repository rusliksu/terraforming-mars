$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\TmUpstreamSync.ps1")
$PSDefaultParameterValues["Invoke-TmUpstreamSync:AllowNonReleaseCheckout"] = $true

$gitPath = (Get-Command git -ErrorAction Stop | Select-Object -First 1).Source
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("tm-upstream-sync-tests-{0}-{1}" -f $PID, ([guid]::NewGuid().ToString("N").Substring(0, 8)))
$ledgerPath = Join-Path $PSScriptRoot "upstream-sync\adoptions.json"
$passed = 0
$openPrLookup = {
    param([string]$Repository, [int]$Number)
    return [pscustomobject]@{ state = "OPEN"; mergeCommit = $null }
}

function Invoke-TestGit {
    param(
        [Parameter(Mandatory)][string]$Repository,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    $result = Invoke-TmSyncProcess -FilePath $gitPath -ArgumentList (@("-C", $Repository) + $Arguments) -StandardInput $null
    if (-not $AllowFailure -and $result.ExitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed in $Repository.`n$($result.StdOut)`n$($result.StdErr)"
    }
    return $result
}

function Assert-TestEqual {
    param(
        [AllowNull()][object]$Actual,
        [AllowNull()][object]$Expected,
        [Parameter(Mandatory)][string]$Message
    )
    if ($Actual -ne $Expected) {
        throw "$Message Expected '$Expected', got '$Actual'."
    }
}

function Assert-TestTrue {
    param(
        [bool]$Condition,
        [Parameter(Mandatory)][string]$Message
    )
    if (-not $Condition) { throw $Message }
}

function Write-TestFile {
    param(
        [Parameter(Mandatory)][string]$Repository,
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][string]$Content
    )
    $path = Join-Path $Repository $RelativePath
    [IO.Directory]::CreateDirectory((Split-Path -Parent $path)) | Out-Null
    [IO.File]::WriteAllText($path, $Content + "`n", [Text.UTF8Encoding]::new($false))
}

function Add-TestCommit {
    param(
        [Parameter(Mandatory)][string]$Repository,
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][string]$Content,
        [Parameter(Mandatory)][string]$Message
    )
    Write-TestFile -Repository $Repository -RelativePath $RelativePath -Content $Content
    Invoke-TestGit -Repository $Repository -Arguments @("add", "--all") | Out-Null
    Invoke-TestGit -Repository $Repository -Arguments @("-c", "commit.gpgSign=false", "commit", "-m", $Message) | Out-Null
    return (Invoke-TestGit -Repository $Repository -Arguments @("rev-parse", "HEAD")).StdOut.Trim()
}

function New-TestFixture {
    param([Parameter(Mandatory)][string]$Name)

    $root = Join-Path $tempRoot $Name
    $origin = Join-Path $root "origin.git"
    $upstream = Join-Path $root "upstream.git"
    $seed = Join-Path $root "seed"
    $work = Join-Path $root "work"
    $reports = Join-Path $root "reports-outside-work"
    [IO.Directory]::CreateDirectory($root) | Out-Null

    Invoke-TestGit -Repository $root -Arguments @("init", "--bare", "--initial-branch=main", $origin) | Out-Null
    Invoke-TestGit -Repository $root -Arguments @("init", "--bare", "--initial-branch=main", $upstream) | Out-Null
    Invoke-TestGit -Repository $root -Arguments @("init", "--initial-branch=main", $seed) | Out-Null
    Invoke-TestGit -Repository $seed -Arguments @("config", "user.name", "TM Sync Test") | Out-Null
    Invoke-TestGit -Repository $seed -Arguments @("config", "user.email", "tm-sync-test@example.invalid") | Out-Null
    [void](Add-TestCommit -Repository $seed -RelativePath "shared.txt" -Content "base" -Message "Initial")
    Invoke-TestGit -Repository $seed -Arguments @("remote", "add", "origin", $origin) | Out-Null
    Invoke-TestGit -Repository $seed -Arguments @("remote", "add", "upstream", $upstream) | Out-Null
    Invoke-TestGit -Repository $seed -Arguments @("push", "origin", "main") | Out-Null
    Invoke-TestGit -Repository $seed -Arguments @("push", "upstream", "main") | Out-Null

    Invoke-TestGit -Repository $root -Arguments @("clone", $origin, $work) | Out-Null
    Invoke-TestGit -Repository $work -Arguments @("config", "user.name", "TM Sync Test") | Out-Null
    Invoke-TestGit -Repository $work -Arguments @("config", "user.email", "tm-sync-test@example.invalid") | Out-Null
    Invoke-TestGit -Repository $work -Arguments @("remote", "add", "upstream", $upstream) | Out-Null

    return [pscustomobject]@{
        Root = $root
        Origin = $origin
        Upstream = $upstream
        Seed = $seed
        Work = $work
        Reports = $reports
    }
}

function New-TestAdoptionLedger {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string[]]$CustomCommits,
        [Parameter(Mandatory)][string[]]$Scope
    )

    $ledger = [ordered]@{
        schema = "TmUpstreamAdoptionLedgerV1"
        schemaVersion = 1
        purpose = "Test-only reviewed adoption contract."
        decisions = @([ordered]@{
            id = $Id
            officialPullRequest = [ordered]@{
                repository = "terraforming-mars/terraforming-mars"
                number = 1
                url = "https://example.invalid/pr/1"
            }
            policy = "adopt_upstream"
            customCommits = $CustomCommits
            scope = $Scope
            resolution = [ordered]@{ strategy = "restore_upstream_scope"; auditVersion = 1 }
            regressionTests = @()
            decision = "Restore only the reviewed exact scope from recorded upstream."
            recordedAt = "2026-07-13"
        })
    }
    [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
    [IO.File]::WriteAllText($Path, ($ledger | ConvertTo-Json -Depth 12) + "`n", [Text.UTF8Encoding]::new($false))
    return $Path
}

function Invoke-TestCase {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][scriptblock]$Body
    )
    & $Body
    $script:passed++
    Write-Host "PASS $Name"
}

[IO.Directory]::CreateDirectory($tempRoot) | Out-Null

try {
    Invoke-TestCase -Name "no-op when canonical contains upstream" -Body {
        $fixture = New-TestFixture -Name "noop"
        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup
        Assert-TestEqual -Actual $report.status -Expected "no-op" -Message "Unexpected no-op status."
        Assert-TestEqual -Actual $report.exitCode -Expected 0 -Message "Unexpected no-op exit code."
        Assert-TestEqual -Actual (Get-TmSyncCurrentBranch -RepositoryRoot $fixture.Work) -Expected "main" -Message "No-op changed branches."
        Assert-TestTrue -Condition (Test-Path -LiteralPath $report.reportPaths.json) -Message "No-op JSON report was not written."
        Assert-TestTrue -Condition ($null -ne $report.duplicates -and $null -ne $report.adoptions -and $null -ne $report.checks) -Message "Required evidence fields are absent."
        Assert-TestEqual -Actual @($report.dirtyAfter).Count -Expected 0 -Message "No-op report should contain an empty dirtyAfter path list."
        Assert-TestEqual -Actual $report.adoptions[0].lookup -Expected "succeeded" -Message "No-op adoption lookup was not recorded."
        Assert-TestEqual -Actual $report.adoptions[0].blocksCandidate -Expected $false -Message "Open PR incorrectly blocked a true no-op."
        Assert-TestEqual -Actual $report.adoptions[0].customCommitsInCanonical[0].inCanonical -Expected $false -Message "Ledger commit presence was not evaluated against canonical ancestry."
        Assert-TestTrue -Condition (-not ($report.adoptions[0].PSObject.Properties.Name -contains "customCommitsPresent")) -Message "Ambiguous customCommitsPresent field is still emitted."
    }

    Invoke-TestCase -Name "no-op does not hide adoption lookup uncertainty" -Body {
        $fixture = New-TestFixture -Name "noop-adoption-uncertainty"
        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -NoAdoptionRemoteLookup
        Assert-TestEqual -Actual $report.status -Expected "adoption-blocked" -Message "Lookup uncertainty was hidden by the upstream ancestry no-op."
        Assert-TestEqual -Actual $report.exitCode -Expected 20 -Message "No-op uncertainty block returned the wrong exit code."
        Assert-TestEqual -Actual (Get-TmSyncCurrentBranch -RepositoryRoot $fixture.Work) -Expected "main" -Message "No-op uncertainty changed branches."
    }

    Invoke-TestCase -Name "primary checkout identity fails before branch mutation" -Body {
        $fixture = New-TestFixture -Name "release-root-guard"
        $primary = Join-Path $fixture.Root "terraforming-mars"
        Invoke-TestGit -Repository $fixture.Root -Arguments @("clone", $fixture.Origin, $primary) | Out-Null
        $beforeBranch = Get-TmSyncCurrentBranch -RepositoryRoot $primary
        $originalToolRoot = $script:TmUpstreamSyncToolRoot
        try {
            $script:TmUpstreamSyncToolRoot = Join-Path $fixture.Root "terraforming-mars-release-main"
            $report = Invoke-TmUpstreamSync -RepositoryRoot $primary -AllowNonReleaseCheckout:$false -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        } finally {
            $script:TmUpstreamSyncToolRoot = $originalToolRoot
        }
        Assert-TestEqual -Actual $report.status -Expected "validation-failed" -Message "Primary checkout was not rejected."
        Assert-TestTrue -Condition (($report.messages -join "`n") -match "dedicated sibling checkout") -Message "Release-root diagnostic is missing."
        Assert-TestEqual -Actual (Get-TmSyncCurrentBranch -RepositoryRoot $primary) -Expected $beforeBranch -Message "Identity guard ran after a branch mutation."
        Assert-TestTrue -Condition ((Get-Content -LiteralPath (Join-Path $PSScriptRoot "sync_tm_upstream.ps1") -Raw) -notmatch "AllowNonReleaseCheckout") -Message "Test-only checkout bypass leaked into the public wrapper."
    }

    Invoke-TestCase -Name "Prepare unshallows canonical history before adoption proof" -Body {
        $fixture = New-TestFixture -Name "unshallow-proof"
        $customCommit = Add-TestCommit -Repository $fixture.Work -RelativePath "feature.txt" -Content "custom" -Message "Reviewed custom change"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Independent upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        $shallowWork = Join-Path $fixture.Root "shallow-work"
        $originUri = "file:///" + ($fixture.Origin -replace "\\", "/")
        Invoke-TestGit -Repository $fixture.Root -Arguments @("clone", "--depth=1", $originUri, $shallowWork) | Out-Null
        Invoke-TestGit -Repository $shallowWork -Arguments @("config", "user.name", "TM Sync Test") | Out-Null
        Invoke-TestGit -Repository $shallowWork -Arguments @("config", "user.email", "tm-sync-test@example.invalid") | Out-Null
        Invoke-TestGit -Repository $shallowWork -Arguments @("remote", "add", "upstream", $fixture.Upstream) | Out-Null
        Assert-TestEqual -Actual (Invoke-TestGit -Repository $shallowWork -Arguments @("rev-parse", "--is-shallow-repository")).StdOut.Trim() -Expected "true" -Message "Shallow fixture is not shallow."
        $fixtureLedger = New-TestAdoptionLedger -Path (Join-Path $fixture.Root "adoption-ledger.json") -Id "fixture-unshallow" -CustomCommits @($customCommit) -Scope @("feature.txt")

        $report = Invoke-TmUpstreamSync -RepositoryRoot $shallowWork -ReportRoot (Join-Path $fixture.Root "shallow-reports") -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-ready" -Message "Unshallowed fixture did not complete candidate preparation."
        Assert-TestEqual -Actual (Invoke-TestGit -Repository $shallowWork -Arguments @("rev-parse", "--is-shallow-repository")).StdOut.Trim() -Expected "false" -Message "Prepare left canonical history shallow."
        Assert-TestTrue -Condition (($report.messages -join "`n") -match "complete canonical history") -Message "Unshallow evidence was not reported."
    }

    Invoke-TestCase -Name "state replacement is atomic and cleans failed temporaries" -Body {
        $stateDirectory = Join-Path $tempRoot "atomic-state"
        $statePath = Join-Path $stateDirectory "state.json"
        Write-TmSyncState -State ([pscustomobject]@{ schema = "test"; version = 1 }) -Path $statePath
        Write-TmSyncState -State ([pscustomobject]@{ schema = "test"; version = 2 }) -Path $statePath
        $script:temporaryWasValid = $false
        $interruptBeforeReplace = {
            param([string]$TemporaryPath, [string]$DestinationPath)
            $candidate = Get-Content -LiteralPath $TemporaryPath -Raw | ConvertFrom-Json
            $script:temporaryWasValid = $candidate.version -eq 3
            throw "simulated atomic replace interruption"
        }
        try {
            Write-TmSyncState -State ([pscustomobject]@{ schema = "test"; version = 3 }) -Path $statePath -BeforeReplaceTestHook $interruptBeforeReplace
            throw "Atomic interruption fixture did not throw."
        } catch {
            Assert-TestTrue -Condition ($_.Exception.Message -match "simulated atomic replace interruption") -Message "Unexpected atomic write failure."
        }
        $persisted = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        Assert-TestEqual -Actual $persisted.version -Expected 2 -Message "Interrupted replacement exposed malformed or new state."
        Assert-TestEqual -Actual @(Get-ChildItem -LiteralPath $stateDirectory -Filter "*.tmp" -Force).Count -Expected 0 -Message "Atomic state writer leaked a temporary file."
        Assert-TestEqual -Actual $script:temporaryWasValid -Expected $true -Message "Temporary state was not fully flushed JSON before replacement."
    }

    Invoke-TestCase -Name "clean divergence creates an unpushed merge candidate" -Body {
        $fixture = New-TestFixture -Name "clean-merge"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "equivalent.txt" -Content "equivalent" -Message "Upstream equivalent patch")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "equivalent.txt" -Content "equivalent" -Message "Custom equivalent patch")
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "custom.txt" -Content "custom" -Message "Custom change")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-ready" -Message "Clean merge did not prepare a candidate."
        Assert-TestEqual -Actual $report.exitCode -Expected 0 -Message "Clean merge returned the wrong exit code."
        Assert-TestEqual -Actual $report.candidate.pushed -Expected $false -Message "Candidate was unexpectedly pushed."
        Assert-TestEqual -Actual $report.candidate.branch -Expected "sync/upstream/main" -Message "New default candidate branch is not deterministic."
        $parentLine = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-list", "--parents", "-n", "1", "HEAD")).StdOut.Trim()
        Assert-TestEqual -Actual (($parentLine -split "\s+").Count) -Expected 3 -Message "Candidate is not a two-parent merge commit."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $report.upstream.sha -Descendant $report.candidate.sha) -Message "Candidate does not contain upstream."
        Assert-TestEqual -Actual $report.duplicates.Count -Expected 1 -Message "Candidate report omitted the stable-patch duplicate."
        Assert-TestEqual -Actual $report.checks.Count -Expected 1 -Message "Injected validation was not recorded."
        Assert-TestEqual -Actual $report.checks[0].status -Expected "passed" -Message "Injected validation did not pass."
        Assert-TestTrue -Condition (Test-Path -LiteralPath $report.checks[0].logPath) -Message "Validation log was not written."
        Assert-TestEqual -Actual @($report.dirtyAfter).Count -Expected 0 -Message "Clean validation was reported dirty."
        $remoteCandidate = Invoke-TestGit -Repository $fixture.Work -Arguments @("ls-remote", "origin", "refs/heads/$($report.candidate.branch)")
        Assert-TestTrue -Condition ([string]::IsNullOrWhiteSpace($remoteCandidate.StdOut)) -Message "Default run mutated the remote."
    }

    Invoke-TestCase -Name "existing candidate additively merges moved canonical and upstream" -Body {
        $fixture = New-TestFixture -Name "existing-candidate-update"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream-first.txt" -Content "upstream first" -Message "Initial upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "custom-first.txt" -Content "custom first" -Message "Initial custom change")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null

        $candidateBranch = "sync/upstream/stable"
        $firstReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -CandidateBranch $candidateBranch -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $firstReport.status -Expected "candidate-ready" -Message "Initial stable candidate was not prepared."
        $previousCandidate = $firstReport.candidate.sha

        $advancer = Join-Path $fixture.Root "canonical-advancer"
        Invoke-TestGit -Repository $fixture.Root -Arguments @("clone", $fixture.Origin, $advancer) | Out-Null
        Invoke-TestGit -Repository $advancer -Arguments @("config", "user.name", "TM Sync Test") | Out-Null
        Invoke-TestGit -Repository $advancer -Arguments @("config", "user.email", "tm-sync-test@example.invalid") | Out-Null
        [void](Add-TestCommit -Repository $advancer -RelativePath "canonical-next.txt" -Content "canonical next" -Message "Move canonical")
        Invoke-TestGit -Repository $advancer -Arguments @("push", "origin", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream-next.txt" -Content "upstream next" -Message "Move upstream")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null

        $updatedReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -CandidateBranch $candidateBranch -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $updatedReport.status -Expected "candidate-ready" -Message "Existing candidate was not updated additively."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $previousCandidate -Descendant $updatedReport.candidate.sha) -Message "Existing candidate history was rewritten instead of extended."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $updatedReport.canonical.sha -Descendant $updatedReport.candidate.sha) -Message "Updated candidate does not contain moved canonical."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $updatedReport.upstream.sha -Descendant $updatedReport.candidate.sha) -Message "Updated candidate does not contain moved upstream."
        $subjects = (Invoke-TestGit -Repository $fixture.Work -Arguments @("log", "--format=%s", "$previousCandidate..$($updatedReport.candidate.sha)")).StdOut
        Assert-TestTrue -Condition ($subjects -match "Merge origin/main into upstream sync candidate") -Message "Canonical additive merge commit is missing."
        Assert-TestTrue -Condition ($subjects -match "Merge upstream/main into upstream sync candidate") -Message "Upstream additive merge commit is missing."
        $remoteCandidate = Invoke-TestGit -Repository $fixture.Work -Arguments @("ls-remote", "origin", "refs/heads/$candidateBranch")
        Assert-TestTrue -Condition ([string]::IsNullOrWhiteSpace($remoteCandidate.StdOut)) -Message "Additive update pushed without explicit permission."
    }

    Invoke-TestCase -Name "default discovery reuses a remote-only candidate across date changes" -Body {
        $fixture = New-TestFixture -Name "remote-only-candidate"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream-first.txt" -Content "upstream first" -Message "Initial upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "custom-first.txt" -Content "custom first" -Message "Initial custom change")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null

        $oldCandidateBranch = "sync/upstream/20260706-weekly"
        $publisher = Join-Path $fixture.Root "candidate-publisher"
        Invoke-TestGit -Repository $fixture.Root -Arguments @("clone", $fixture.Origin, $publisher) | Out-Null
        Invoke-TestGit -Repository $publisher -Arguments @("config", "user.name", "TM Sync Test") | Out-Null
        Invoke-TestGit -Repository $publisher -Arguments @("config", "user.email", "tm-sync-test@example.invalid") | Out-Null
        Invoke-TestGit -Repository $publisher -Arguments @("remote", "add", "upstream", $fixture.Upstream) | Out-Null
        Invoke-TestGit -Repository $publisher -Arguments @("fetch", "upstream", "+refs/heads/main:refs/remotes/upstream/main") | Out-Null
        Invoke-TestGit -Repository $publisher -Arguments @("switch", "--create", $oldCandidateBranch, "origin/main") | Out-Null
        Invoke-TestGit -Repository $publisher -Arguments @("-c", "commit.gpgSign=false", "merge", "--no-ff", "-m", "Create prior-week candidate", "refs/remotes/upstream/main") | Out-Null
        $remoteOnlySha = (Invoke-TestGit -Repository $publisher -Arguments @("rev-parse", "HEAD")).StdOut.Trim()
        Invoke-TestGit -Repository $publisher -Arguments @("push", "origin", "HEAD:refs/heads/$oldCandidateBranch") | Out-Null
        Assert-TestTrue -Condition ((Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "--verify", "refs/heads/$oldCandidateBranch") -AllowFailure).ExitCode -ne 0) -Message "Remote-only fixture unexpectedly has a local candidate."

        Invoke-TestGit -Repository $publisher -Arguments @("switch", "main") | Out-Null
        [void](Add-TestCommit -Repository $publisher -RelativePath "canonical-next.txt" -Content "canonical next" -Message "Move canonical after prior-week candidate")
        Invoke-TestGit -Repository $publisher -Arguments @("push", "origin", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream-next.txt" -Content "upstream next" -Message "Move upstream after prior-week candidate")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-ready" -Message "Remote-only candidate was not reused."
        Assert-TestEqual -Actual $report.candidate.branch -Expected $oldCandidateBranch -Message "A date-derived replacement candidate was selected."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $remoteOnlySha -Descendant $report.candidate.sha) -Message "Remote candidate history was not preserved."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $report.canonical.sha -Descendant $report.candidate.sha) -Message "Remote-only candidate lacks latest canonical."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $report.upstream.sha -Descendant $report.candidate.sha) -Message "Remote-only candidate lacks latest upstream."
    }

    Invoke-TestCase -Name "default discovery blocks multiple candidate branches" -Body {
        $fixture = New-TestFixture -Name "multiple-candidates"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        $mainSha = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "HEAD")).StdOut.Trim()
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "${mainSha}:refs/heads/sync/upstream/first", "${mainSha}:refs/heads/sync/upstream/second") | Out-Null

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "validation-failed" -Message "Multiple candidate branches were not blocked."
        Assert-TestTrue -Condition (($report.messages -join "`n") -match "Multiple sync candidates exist") -Message "Multiple-candidate diagnostic is missing."
        Assert-TestEqual -Actual (Get-TmSyncCurrentBranch -RepositoryRoot $fixture.Work) -Expected "main" -Message "Ambiguous discovery changed branches."
        $explicitReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -CandidateBranch "sync/upstream/first" -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $explicitReport.status -Expected "validation-failed" -Message "Explicit CandidateBranch bypassed the multiple-candidate guard."
        Assert-TestTrue -Condition (($explicitReport.messages -join "`n") -match "Multiple sync candidates exist") -Message "Explicit multiple-candidate diagnostic is missing."
        Assert-TestEqual -Actual (Get-TmSyncCurrentBranch -RepositoryRoot $fixture.Work) -Expected "main" -Message "Explicit ambiguous discovery changed branches."
    }

    Invoke-TestCase -Name "Continue retries a phase after a pre-merge crash window" -Body {
        $fixture = New-TestFixture -Name "continue-crash-window"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("fetch", "origin", "+refs/heads/main:refs/remotes/origin/main") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("fetch", "upstream", "+refs/heads/main:refs/remotes/upstream/main") | Out-Null
        $canonicalSha = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "refs/remotes/origin/main")).StdOut.Trim()
        $upstreamSha = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "refs/remotes/upstream/main")).StdOut.Trim()
        $candidateBranch = "sync/upstream/crash-window"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("switch", "--create", $candidateBranch, $canonicalSha) | Out-Null

        $statePaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "crash-window-state"
        $ledgerSnapshot = Read-TmAdoptionLedger -Path $ledgerPath
        $state = [pscustomobject]@{
            schema = "TmUpstreamSyncStateV2"
            createdAt = [DateTimeOffset]::UtcNow.ToString("o")
            candidateBranch = $candidateBranch
            adoptionLedgerSha256 = $ledgerSnapshot.Sha256
            validationPlan = @([pscustomobject]@{ name = "saved-status"; command = "git status --porcelain=v1" })
            canonical = [pscustomobject]@{ remote = "origin"; branch = "main"; ref = "refs/remotes/origin/main"; sha = $canonicalSha }
            upstream = [pscustomobject]@{ remote = "upstream"; branch = "main"; ref = "refs/remotes/upstream/main"; sha = $upstreamSha }
            phases = @([pscustomobject]@{ name = "upstream"; sha = $upstreamSha; commitMessage = "Merge upstream/main into upstream sync candidate" })
            nextPhaseIndex = 0
            currentPhase = "upstream"
            adoptionResolutions = @()
            nextResolutionIndex = 0
            currentResolution = $null
        }
        Write-TmSyncState -State $state -Path $statePaths.StatePath
        Assert-TestTrue -Condition ((Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "--verify", "MERGE_HEAD") -AllowFailure).ExitCode -ne 0) -Message "Crash-window fixture unexpectedly has MERGE_HEAD."

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -Mode Continue -NoFetch -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-ready" -Message "Continue did not safely retry the pre-merge crash window."
        Assert-TestTrue -Condition (Test-TmSyncAncestor -RepositoryRoot $fixture.Work -Ancestor $upstreamSha -Descendant $report.candidate.sha) -Message "Crash-window retry did not incorporate upstream."
        Assert-TestTrue -Condition (-not (Test-Path -LiteralPath $statePaths.StatePath)) -Message "Completed crash-window state was not removed."
    }

    Invoke-TestCase -Name "Continue cannot weaken the validation plan saved by Prepare" -Body {
        $fixture = New-TestFixture -Name "saved-validation-plan"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "shared.txt" -Content "upstream version" -Message "Upstream conflict")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "shared.txt" -Content "custom version" -Message "Custom conflict")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $markerPath = Join-Path $fixture.Root "saved-validation-ran.txt"
        $escapedMarker = $markerPath.Replace("'", "''")
        $savedCommand = "Set-Content -LiteralPath '$escapedMarker' -Value saved"

        $prepareReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @($savedCommand)
        Assert-TestEqual -Actual $prepareReport.status -Expected "conflicts" -Message "Saved-plan fixture did not stop at its conflict."
        Write-TestFile -Repository $fixture.Work -RelativePath "shared.txt" -Content "reviewed resolution"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("add", "shared.txt") | Out-Null

        $continueReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -Mode Continue -NoFetch -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("exit 99")
        Assert-TestEqual -Actual $continueReport.status -Expected "candidate-ready" -Message "Continue used the weaker caller override instead of the saved plan."
        Assert-TestTrue -Condition (Test-Path -LiteralPath $markerPath) -Message "Saved validation command did not run."
        Assert-TestEqual -Actual $continueReport.checks[0].command -Expected $savedCommand -Message "Continue report did not retain the exact saved command."
        Assert-TestTrue -Condition (($continueReport.messages -join "`n") -match "ignored caller-supplied") -Message "Ignored Continue override was not reported."
        $statePaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "saved-plan-state"
        Assert-TestTrue -Condition (-not (Test-Path -LiteralPath $statePaths.StatePath)) -Message "Candidate-ready state was not removed."
    }

    Invoke-TestCase -Name "Continue blocks a changed adoption ledger and retains state" -Body {
        $fixture = New-TestFixture -Name "ledger-hash-mismatch"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "shared.txt" -Content "upstream version" -Message "Upstream conflict")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "shared.txt" -Content "custom version" -Message "Custom conflict")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $copiedLedger = Join-Path $fixture.Root "adoptions-copy.json"
        Copy-Item -LiteralPath $ledgerPath -Destination $copiedLedger

        $prepareReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $copiedLedger -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $prepareReport.status -Expected "conflicts" -Message "Ledger-hash fixture did not save state."
        [IO.File]::AppendAllText($copiedLedger, "`n ", [Text.UTF8Encoding]::new($false))

        $continueReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -Mode Continue -NoFetch -ReportRoot $fixture.Reports -AdoptionLedgerPath $copiedLedger -AdoptionLookupProvider $openPrLookup -ValidationCommands @("exit 0")
        Assert-TestEqual -Actual $continueReport.status -Expected "validation-failed" -Message "Changed ledger was not blocked."
        Assert-TestTrue -Condition (($continueReport.messages -join "`n") -match "Adoption ledger changed after Prepare") -Message "Ledger mismatch diagnostic is missing."
        $statePaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "ledger-mismatch-state"
        Assert-TestTrue -Condition (Test-Path -LiteralPath $statePaths.StatePath) -Message "Ledger mismatch removed resumable state."
    }

    Invoke-TestCase -Name "push uses the exact validated candidate SHA" -Body {
        $fixture = New-TestFixture -Name "exact-validated-push"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "custom.txt" -Content "custom" -Message "Custom change")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $candidateBranch = "sync/upstream/exact-push"
        $moveBranchAfterValidation = {
            param([string]$Repository, [string]$Branch, [string]$ValidatedSha)
            [void](Add-TestCommit -Repository $Repository -RelativePath "after-validation.txt" -Content "not validated" -Message "Move local candidate after validation")
        }

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -CandidateBranch $candidateBranch -PushCandidate -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -BeforePushTestHook $moveBranchAfterValidation -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-pushed" -Message "Exact validated candidate was not pushed."
        Assert-TestEqual -Actual $report.candidate.remoteVerified -Expected $true -Message "Successful push was not verified against the remote."
        Assert-TestEqual -Actual $report.candidate.remoteSha -Expected $report.candidate.sha -Message "Verified remote SHA was not recorded."
        $remoteLine = (Invoke-TestGit -Repository $fixture.Work -Arguments @("ls-remote", "origin", "refs/heads/$candidateBranch")).StdOut.Trim()
        $remoteSha = ($remoteLine -split "\s+" | Select-Object -First 1)
        $localSha = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "HEAD")).StdOut.Trim()
        Assert-TestEqual -Actual $remoteSha -Expected $report.candidate.sha -Message "Push followed a mutable branch ref instead of the validated SHA."
        Assert-TestTrue -Condition ($localSha -ne $remoteSha) -Message "Push race fixture did not move the local branch after validation."
        $statePaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "verified-push-state"
        Assert-TestTrue -Condition (-not (Test-Path -LiteralPath $statePaths.StatePath)) -Message "Verified successful push did not remove state."
    }

    Invoke-TestCase -Name "post-push remote SHA mismatch blocks success and retains state" -Body {
        $fixture = New-TestFixture -Name "post-push-mismatch"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "custom.txt" -Content "custom" -Message "Custom change")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $wrongRemoteSha = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "HEAD")).StdOut.Trim()
        $candidateBranch = "sync/upstream/post-push-mismatch"
        $replaceRemoteAfterPush = {
            param([string]$Repository, [string]$Branch, [string]$ValidatedSha)
            Invoke-TestGit -Repository $fixture.Origin -Arguments @("update-ref", "refs/heads/$Branch", $wrongRemoteSha) | Out-Null
        }.GetNewClosure()

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -CandidateBranch $candidateBranch -PushCandidate -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -AfterPushTestHook $replaceRemoteAfterPush -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "validation-failed" -Message "Remote mismatch was reported as a successful push."
        Assert-TestEqual -Actual $report.exitCode -Expected 40 -Message "Remote mismatch returned the wrong exit code."
        Assert-TestEqual -Actual $report.candidate.remoteVerified -Expected $false -Message "Mismatched remote was marked verified."
        Assert-TestEqual -Actual $report.candidate.remoteSha -Expected $wrongRemoteSha -Message "Mismatched remote SHA evidence was not recorded."
        Assert-TestTrue -Condition (($report.messages -join "`n") -match "Remote candidate verification failed") -Message "Remote mismatch diagnostic is missing."
        $statePaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "post-push-mismatch-state"
        Assert-TestTrue -Condition (Test-Path -LiteralPath $statePaths.StatePath) -Message "Remote verification failure removed resumable state."
    }

    Invoke-TestCase -Name "reviewed adoption restores exact upstream scope and records an audit commit" -Body {
        $fixture = New-TestFixture -Name "adoption-apply"
        $customCommit = Add-TestCommit -Repository $fixture.Work -RelativePath "feature.txt" -Content "custom implementation" -Message "Custom scoped implementation"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $upstreamMergeSha = Add-TestCommit -Repository $fixture.Seed -RelativePath "feature.txt" -Content "upstream implementation" -Message "Official scoped implementation"
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        $decisionId = "fixture-adopt-upstream"
        $fixtureLedger = New-TestAdoptionLedger -Path (Join-Path $fixture.Root "adoption-ledger.json") -Id $decisionId -CustomCommits @($customCommit) -Scope @("feature.txt")
        $mergedLookup = {
            param([string]$Repository, [int]$Number)
            [pscustomobject]@{ state = "MERGED"; mergeCommit = [pscustomobject]@{ oid = $upstreamMergeSha } }
        }.GetNewClosure()

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-ready" -Message "Eligible adoption did not produce a ready candidate."
        Assert-TestEqual -Actual $report.adoptions[0].resolutionProof.passed -Expected $true -Message "Exact-scope adoption proof did not pass."
        Assert-TestEqual -Actual $report.adoptions[0].resolutionApplied -Expected $true -Message "Adoption was not marked applied."
        Assert-TestEqual -Actual (Get-Content -LiteralPath (Join-Path $fixture.Work "feature.txt") -Raw).Trim() -Expected "upstream implementation" -Message "Custom implementation still acts after adoption."
        Assert-TestEqual -Actual (Invoke-TestGit -Repository $fixture.Work -Arguments @("diff", "--quiet", $upstreamMergeSha, "HEAD", "--", "feature.txt") -AllowFailure).ExitCode -Expected 0 -Message "Adopted scope is not byte-for-byte the recorded upstream tree."
        $auditSubject = "Adopt upstream for $decisionId"
        Assert-TestTrue -Condition ((Invoke-TestGit -Repository $fixture.Work -Arguments @("log", "--format=%s", "-5")).StdOut -match [regex]::Escape($auditSubject)) -Message "Adoption audit commit is missing."
        $scopeHash = Get-TmAdoptionScopeHash -Scope @("feature.txt")
        $auditBody = Get-TmAdoptionAuditBody -DecisionId $decisionId -UpstreamSha $upstreamMergeSha -ScopeHash $scopeHash
        $auditMessage = (Invoke-TestGit -Repository $fixture.Work -Arguments @("show", "-s", "--format=%B", "HEAD")).StdOut
        Assert-TestTrue -Condition ($auditMessage -match "TM-Adoption-Upstream: $upstreamMergeSha") -Message "Adoption upstream trailer is missing."
        Assert-TestTrue -Condition ($auditMessage -match "TM-Adoption-Scope-SHA256: $scopeHash") -Message "Adoption scope trailer is missing."

        $auditCountBefore = @((Invoke-TestGit -Repository $fixture.Work -Arguments @("log", "--format=%s")).StdOut -split "`r?`n" | Where-Object { $_ -eq $auditSubject }).Count
        $recoveryPaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "adoption-recovery"
        $recoveryState = [pscustomobject]@{
            upstream = [pscustomobject]@{ sha = $upstreamMergeSha }
            adoptionResolutions = @([pscustomobject]@{
                id = $decisionId; strategy = "restore_upstream_scope"; auditVersion = 1; scope = @("feature.txt")
                scopeHash = $scopeHash; upstreamSha = $upstreamMergeSha; commitSubject = $auditSubject; commitBody = $auditBody
            })
            nextResolutionIndex = 0
            currentResolution = $decisionId
        }
        $recoveryReport = [ordered]@{
            status = "starting"; exitCode = 40; messages = @()
            adoptions = @([pscustomobject]@{
                id = $decisionId; eligible = $true; outcome = "adopt_upstream"; resolutionApplied = $false
                resolutionProof = [pscustomobject]@{ scope = @("feature.txt"); scopeHash = $scopeHash }
            })
        }
        $recovered = Invoke-TmSyncAdoptionResolutions -RepositoryRoot $fixture.Work -State $recoveryState -Report $recoveryReport -StatePath $recoveryPaths.StatePath
        Assert-TestEqual -Actual $recovered -Expected $true -Message "Crash-after-commit adoption recovery failed."
        Assert-TestEqual -Actual $recoveryState.nextResolutionIndex -Expected 1 -Message "Recovered adoption state did not advance."
        $auditCountAfter = @((Invoke-TestGit -Repository $fixture.Work -Arguments @("log", "--format=%s")).StdOut -split "`r?`n" | Where-Object { $_ -eq $auditSubject }).Count
        Assert-TestEqual -Actual $auditCountAfter -Expected $auditCountBefore -Message "Crash recovery duplicated the adoption audit commit."
    }

    Invoke-TestCase -Name "unreviewed extra canonical touch blocks adoption before branch mutation" -Body {
        $fixture = New-TestFixture -Name "adoption-extra-touch"
        $reviewedCommit = Add-TestCommit -Repository $fixture.Work -RelativePath "feature.txt" -Content "custom v1" -Message "Reviewed custom implementation"
        $extraCommit = Add-TestCommit -Repository $fixture.Work -RelativePath "feature.txt" -Content "custom v2" -Message "Unreviewed later touch"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $upstreamMergeSha = Add-TestCommit -Repository $fixture.Seed -RelativePath "feature.txt" -Content "upstream implementation" -Message "Official scoped implementation"
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        $fixtureLedger = New-TestAdoptionLedger -Path (Join-Path $fixture.Root "adoption-ledger.json") -Id "fixture-extra-touch" -CustomCommits @($reviewedCommit) -Scope @("feature.txt")
        $mergedLookup = {
            param([string]$Repository, [int]$Number)
            [pscustomobject]@{ state = "MERGED"; mergeCommit = [pscustomobject]@{ oid = $upstreamMergeSha } }
        }.GetNewClosure()

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "adoption-blocked" -Message "Unreviewed scope touch did not block adoption."
        Assert-TestEqual -Actual $report.adoptions[0].resolutionProof.passed -Expected $false -Message "Extra touch incorrectly passed exact-scope proof."
        Assert-TestTrue -Condition (@($report.adoptions[0].resolutionProof.extraCanonicalScopeCommits) -contains $extraCommit) -Message "Extra canonical touch evidence is missing."
        Assert-TestEqual -Actual (Get-TmSyncCurrentBranch -RepositoryRoot $fixture.Work) -Expected "main" -Message "Proof failure switched to a candidate branch."
        Assert-TestEqual -Actual (Get-Content -LiteralPath (Join-Path $fixture.Work "feature.txt") -Raw).Trim() -Expected "custom v2" -Message "Proof failure mutated the custom implementation."
    }

    Invoke-TestCase -Name "adoption audit remains a durable baseline across upstream cycles" -Body {
        $fixture = New-TestFixture -Name "adoption-noop-recovery"
        $customCommit = Add-TestCommit -Repository $fixture.Work -RelativePath "feature.txt" -Content "custom active" -Message "Custom scoped implementation"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $upstreamMergeSha = Add-TestCommit -Repository $fixture.Seed -RelativePath "feature.txt" -Content "upstream implementation" -Message "Official scoped implementation"
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("fetch", "upstream", "+refs/heads/main:refs/remotes/upstream/main") | Out-Null
        $manualMerge = Invoke-TestGit -Repository $fixture.Work -Arguments @("merge", "--no-ff", "--no-commit", "refs/remotes/upstream/main") -AllowFailure
        Assert-TestTrue -Condition ($manualMerge.ExitCode -ne 0) -Message "No-op recovery fixture did not create its expected conflict."
        Write-TestFile -Repository $fixture.Work -RelativePath "feature.txt" -Content "custom active"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("add", "feature.txt") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("-c", "commit.gpgSign=false", "commit", "-m", "Manual upstream merge preserving custom") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $fixtureLedger = New-TestAdoptionLedger -Path (Join-Path $fixture.Root "adoption-ledger.json") -Id "fixture-noop-recovery" -CustomCommits @($customCommit) -Scope @("feature.txt")
        $mergedLookup = {
            param([string]$Repository, [int]$Number)
            [pscustomobject]@{ state = "MERGED"; mergeCommit = [pscustomobject]@{ oid = $upstreamMergeSha } }
        }.GetNewClosure()

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-ready" -Message "Upstream ancestry incorrectly short-circuited unresolved adoption as no-op."
        Assert-TestEqual -Actual $report.adoptions[0].resolutionApplied -Expected $true -Message "No-op recovery did not apply adoption."
        Assert-TestEqual -Actual (Get-Content -LiteralPath (Join-Path $fixture.Work "feature.txt") -Raw).Trim() -Expected "upstream implementation" -Message "No-op recovery left custom implementation active."
        Assert-TestTrue -Condition (($report.messages -join "`n") -match "scoped adoption still requires") -Message "No-op recovery decision was not reported."
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "$($report.candidate.sha):refs/heads/main") | Out-Null
        $verifiedNoOp = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $verifiedNoOp.status -Expected "no-op" -Message "Exact tree plus audit evidence was not accepted as a resolved no-op."
        Assert-TestEqual -Actual $verifiedNoOp.adoptions[0].resolutionApplied -Expected $true -Message "Resolved no-op lost adoption evidence."

        $upstreamSecondSha = Add-TestCommit -Repository $fixture.Seed -RelativePath "feature.txt" -Content "upstream implementation v2" -Message "Later official scoped update"
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        $secondCycle = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $secondCycle.status -Expected "candidate-ready" -Message "Later upstream scope update did not produce a second adoption candidate."
        Assert-TestEqual -Actual $secondCycle.adoptions[0].resolutionProof.baselineKind -Expected "validated_audit" -Message "Second cycle re-proved original commits instead of using durable audit baseline."
        Assert-TestEqual -Actual $secondCycle.adoptions[0].resolutionApplied -Expected $true -Message "Second-cycle adoption was not applied."
        Assert-TestEqual -Actual (Get-Content -LiteralPath (Join-Path $fixture.Work "feature.txt") -Raw).Trim() -Expected "upstream implementation v2" -Message "Second cycle did not restore current upstream scope."
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "$($secondCycle.candidate.sha):refs/heads/main") | Out-Null

        $thirdRun = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $thirdRun.status -Expected "no-op" -Message "Promoted second-cycle audit did not produce verified no-op."
        Assert-TestEqual -Actual $thirdRun.adoptions[0].resolutionEvidence.recordedUpstreamSha -Expected $upstreamSecondSha -Message "Third run did not select latest audit baseline."

        $postAuditTouch = Add-TestCommit -Repository $fixture.Work -RelativePath "feature.txt" -Content "post-audit custom touch" -Message "Post-audit custom scope change"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "HEAD:refs/heads/main") | Out-Null
        $blocked = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $blocked.status -Expected "adoption-blocked" -Message "Post-audit ordinary scope touch did not block."
        Assert-TestTrue -Condition (@($blocked.adoptions[0].resolutionProof.extraCanonicalScopeCommits) -contains $postAuditTouch) -Message "Post-audit touch evidence is missing."
    }

    Invoke-TestCase -Name "subject-only adoption spoof is not audit evidence" -Body {
        $fixture = New-TestFixture -Name "adoption-subject-spoof"
        $customCommit = Add-TestCommit -Repository $fixture.Work -RelativePath "feature.txt" -Content "custom" -Message "Reviewed custom implementation"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $upstreamSha = Add-TestCommit -Repository $fixture.Seed -RelativePath "feature.txt" -Content "upstream" -Message "Official implementation"
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("fetch", "upstream", "+refs/heads/main:refs/remotes/upstream/main") | Out-Null
        [void](Invoke-TestGit -Repository $fixture.Work -Arguments @("merge", "--no-ff", "--no-commit", "refs/remotes/upstream/main") -AllowFailure)
        Write-TestFile -Repository $fixture.Work -RelativePath "feature.txt" -Content "upstream"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("add", "feature.txt") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("-c", "commit.gpgSign=false", "commit", "-m", "Manual upstream merge") | Out-Null
        Invoke-TestGit -Repository $fixture.Work -Arguments @("-c", "commit.gpgSign=false", "commit", "--allow-empty", "-m", "Adopt upstream for fixture-subject-spoof") | Out-Null
        $spoofSha = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "HEAD")).StdOut.Trim()
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $fixtureLedger = New-TestAdoptionLedger -Path (Join-Path $fixture.Root "adoption-ledger.json") -Id "fixture-subject-spoof" -CustomCommits @($customCommit) -Scope @("feature.txt")
        $mergedLookup = {
            param([string]$Repository, [int]$Number)
            [pscustomobject]@{ state = "MERGED"; mergeCommit = [pscustomobject]@{ oid = $upstreamSha } }
        }.GetNewClosure()

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $fixtureLedger -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "candidate-ready" -Message "Subject-only spoof was accepted as resolved no-op."
        Assert-TestEqual -Actual $report.adoptions[0].resolutionProof.baselineKind -Expected "initial_custom_commits" -Message "Subject-only spoof became an audit baseline."
        Assert-TestTrue -Condition ($report.candidate.sha -ne $spoofSha) -Message "No valid structured audit commit was added after spoof."
    }

    Invoke-TestCase -Name "adoption lookup uncertainty blocks ready and push" -Body {
        $fixture = New-TestFixture -Name "adoption-lookup-block"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "custom.txt" -Content "custom" -Message "Custom change")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -PushCandidate -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -NoAdoptionRemoteLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "adoption-blocked" -Message "Unavailable adoption metadata did not block the candidate."
        Assert-TestEqual -Actual $report.exitCode -Expected 20 -Message "Adoption block returned the wrong exit code."
        Assert-TestEqual -Actual $report.adoptions[0].blocksCandidate -Expected $true -Message "Blocking adoption uncertainty was not recorded."
        Assert-TestEqual -Actual $report.checks[0].status -Expected "passed" -Message "Candidate was not validated before adoption block."
        $remoteCandidate = Invoke-TestGit -Repository $fixture.Work -Arguments @("ls-remote", "origin", "refs/heads/$($report.candidate.branch)")
        Assert-TestTrue -Condition ([string]::IsNullOrWhiteSpace($remoteCandidate.StdOut)) -Message "Adoption-blocked candidate was pushed."
    }

    Invoke-TestCase -Name "merged adoption absent from fetched upstream blocks ready" -Body {
        $fixture = New-TestFixture -Name "adoption-merged-ambiguity"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        $canonicalOnlySha = Add-TestCommit -Repository $fixture.Work -RelativePath "custom.txt" -Content "custom" -Message "Custom change"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null
        $mergedLookup = {
            param([string]$Repository, [int]$Number)
            return [pscustomobject]@{ state = "MERGED"; mergeCommit = [pscustomobject]@{ oid = $canonicalOnlySha } }
        }.GetNewClosure()

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $mergedLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $report.status -Expected "adoption-blocked" -Message "Merged-but-not-fetched adoption ambiguity did not block ready."
        Assert-TestEqual -Actual $report.adoptions[0].pullRequestState -Expected "MERGED" -Message "Merged adoption state was not recorded."
        Assert-TestEqual -Actual $report.adoptions[0].mergeShaInUpstream -Expected $false -Message "Ambiguous merge was incorrectly marked present in upstream."
        Assert-TestEqual -Actual $report.adoptions[0].blocksCandidate -Expected $true -Message "Merged adoption ambiguity was not marked blocking."
    }

    Invoke-TestCase -Name "conflict reports paths and Continue detects stale refs before push" -Body {
        $fixture = New-TestFixture -Name "conflict-stale"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "shared.txt" -Content "upstream version" -Message "Upstream conflict")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "shared.txt" -Content "custom version" -Message "Custom conflict")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null

        $conflictReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $conflictReport.status -Expected "conflicts" -Message "Conflict was not reported."
        Assert-TestEqual -Actual $conflictReport.exitCode -Expected 20 -Message "Conflict returned the wrong exit code."
        Assert-TestTrue -Condition (@($conflictReport.conflicts.path) -contains "shared.txt") -Message "Conflict report omitted shared.txt."

        Write-TestFile -Repository $fixture.Work -RelativePath "shared.txt" -Content "reviewed resolution"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("add", "shared.txt") | Out-Null

        $advancer = Join-Path $fixture.Root "origin-advancer"
        Invoke-TestGit -Repository $fixture.Root -Arguments @("clone", $fixture.Origin, $advancer) | Out-Null
        Invoke-TestGit -Repository $advancer -Arguments @("config", "user.name", "TM Sync Test") | Out-Null
        Invoke-TestGit -Repository $advancer -Arguments @("config", "user.email", "tm-sync-test@example.invalid") | Out-Null
        [void](Add-TestCommit -Repository $advancer -RelativePath "late.txt" -Content "late canonical change" -Message "Advance canonical")
        Invoke-TestGit -Repository $advancer -Arguments @("push", "origin", "main") | Out-Null

        $staleReport = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -Mode Continue -NoFetch -PushCandidate -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("git status --porcelain=v1")
        Assert-TestEqual -Actual $staleReport.status -Expected "stale-ref" -Message "Stale canonical ref was not detected."
        Assert-TestEqual -Actual $staleReport.exitCode -Expected 30 -Message "Stale ref returned the wrong exit code."
        Assert-TestTrue -Condition ($staleReport.staleRef.ActualCanonical -ne $staleReport.staleRef.ExpectedCanonical) -Message "Stale report lacks canonical drift evidence."
        $statePaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "stale-state"
        Assert-TestTrue -Condition (Test-Path -LiteralPath $statePaths.StatePath) -Message "Stale-ref failure removed resumable state."
        $remoteCandidate = Invoke-TestGit -Repository $fixture.Work -Arguments @("ls-remote", "origin", "refs/heads/$($staleReport.candidate.branch)")
        Assert-TestTrue -Condition ([string]::IsNullOrWhiteSpace($remoteCandidate.StdOut)) -Message "Stale candidate was pushed."
    }

    Invoke-TestCase -Name "validation failure preserves candidate and blocks push" -Body {
        $fixture = New-TestFixture -Name "validation-failure"
        [void](Add-TestCommit -Repository $fixture.Seed -RelativePath "upstream.txt" -Content "upstream" -Message "Upstream change")
        Invoke-TestGit -Repository $fixture.Seed -Arguments @("push", "upstream", "main") | Out-Null
        [void](Add-TestCommit -Repository $fixture.Work -RelativePath "custom.txt" -Content "custom" -Message "Custom change")
        Invoke-TestGit -Repository $fixture.Work -Arguments @("push", "origin", "main") | Out-Null

        $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -PushCandidate -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath -AdoptionLookupProvider $openPrLookup -ValidationCommands @("Set-Content -LiteralPath validation-dirty.txt -Value dirty; exit 9")
        Assert-TestEqual -Actual $report.status -Expected "validation-failed" -Message "Failed validation did not block candidate."
        Assert-TestEqual -Actual $report.exitCode -Expected 40 -Message "Failed validation returned the wrong exit code."
        Assert-TestEqual -Actual $report.checks[0].status -Expected "failed" -Message "Failed check was not recorded."
        Assert-TestEqual -Actual $report.checks[0].exitCode -Expected 9 -Message "Failed check exit code was lost."
        Assert-TestTrue -Condition ($report.checks[0].durationMs -ge 0) -Message "Failed check duration was not recorded."
        Assert-TestTrue -Condition (Test-Path -LiteralPath $report.checks[0].logPath) -Message "Failed validation log was not written."
        Assert-TestTrue -Condition (@($report.dirtyAfter) -contains "validation-dirty.txt") -Message "Dirty validation path was not recorded."
        Assert-TestTrue -Condition (-not [string]::IsNullOrWhiteSpace($report.candidate.sha)) -Message "Failed candidate was not preserved for inspection."
        $statePaths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "validation-state"
        Assert-TestTrue -Condition (Test-Path -LiteralPath $statePaths.StatePath) -Message "Validation failure removed resumable state."
        $remoteCandidate = Invoke-TestGit -Repository $fixture.Work -Arguments @("ls-remote", "origin", "refs/heads/$($report.candidate.branch)")
        Assert-TestTrue -Condition ([string]::IsNullOrWhiteSpace($remoteCandidate.StdOut)) -Message "Validation-failed candidate was pushed."
    }

    Invoke-TestCase -Name "exclusive lock returns the dedicated busy exit" -Body {
        $fixture = New-TestFixture -Name "lock"
        $paths = Get-TmUpstreamSyncPaths -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -RunId "held-lock"
        $heldLock = Enter-TmUpstreamSyncLock -LockPath $paths.LockPath
        Assert-TestTrue -Condition ($null -ne $heldLock) -Message "Test could not acquire the initial lock."
        try {
            $report = Invoke-TmUpstreamSync -RepositoryRoot $fixture.Work -ReportRoot $fixture.Reports -AdoptionLedgerPath $ledgerPath
            Assert-TestEqual -Actual $report.status -Expected "lock-busy" -Message "Concurrent run did not report lock-busy."
            Assert-TestEqual -Actual $report.exitCode -Expected 75 -Message "Lock contention returned the wrong exit code."
        } finally {
            $heldLock.Dispose()
        }
    }

    Invoke-TestCase -Name "stable patch-id finds equivalent commits" -Body {
        $fixture = New-TestFixture -Name "patch-id"
        $base = (Invoke-TestGit -Repository $fixture.Work -Arguments @("rev-parse", "HEAD")).StdOut.Trim()
        $left = Add-TestCommit -Repository $fixture.Work -RelativePath "equivalent.txt" -Content "same patch" -Message "Left patch"
        Invoke-TestGit -Repository $fixture.Work -Arguments @("switch", "--create", "equivalent-right", $base) | Out-Null
        $right = Add-TestCommit -Repository $fixture.Work -RelativePath "equivalent.txt" -Content "same patch" -Message "Different message"
        Assert-TestTrue -Condition ($left -ne $right) -Message "Patch-id test commits unexpectedly have the same SHA."
        $duplicates = @(Find-TmDuplicatePatches -RepositoryRoot $fixture.Work -LeftCommits @($left) -RightCommits @($right))
        Assert-TestEqual -Actual $duplicates.Count -Expected 1 -Message "Equivalent patches were not detected."
        Assert-TestEqual -Actual $duplicates[0].leftCommit -Expected $left -Message "Duplicate result has the wrong left commit."
    }
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "tm upstream sync regressions: $passed passed"
