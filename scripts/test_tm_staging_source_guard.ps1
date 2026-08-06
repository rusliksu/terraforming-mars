$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\TmReleaseGuards.ps1")

$exactSha = ("a" * 40)
$cases = @(
    @{
        Name = "exact-main"
        Expected = $true
        Head = $exactSha
        OriginMain = $exactSha
        Status = ""
        AllowDirty = $false
        AllowPrimary = $false
    },
    @{
        Name = "sha-mismatch"
        Expected = $false
        Head = ("b" * 40)
        OriginMain = $exactSha
        Status = ""
        AllowDirty = $false
        AllowPrimary = $false
    },
    @{
        Name = "missing-origin-main"
        Expected = $false
        Head = $exactSha
        OriginMain = ""
        Status = ""
        AllowDirty = $false
        AllowPrimary = $false
    },
    @{
        Name = "dirty-source"
        Expected = $false
        Head = $exactSha
        OriginMain = $exactSha
        Status = " M scripts/deploy_tm_server.ps1"
        AllowDirty = $false
        AllowPrimary = $false
    },
    @{
        Name = "dirty-bypass"
        Expected = $false
        Head = $exactSha
        OriginMain = $exactSha
        Status = ""
        AllowDirty = $true
        AllowPrimary = $false
    },
    @{
        Name = "primary-bypass"
        Expected = $false
        Head = $exactSha
        OriginMain = $exactSha
        Status = ""
        AllowDirty = $false
        AllowPrimary = $true
    }
)

foreach ($case in $cases) {
    $threw = $false
    try {
        Assert-TmStagingSource `
            -SourceRoot "C:\release\terraforming-mars" `
            -HeadSha $case.Head `
            -OriginMainSha $case.OriginMain `
            -GitStatus $case.Status `
            -AllowDirtySource:$case.AllowDirty `
            -AllowPrimaryWorkingTree:$case.AllowPrimary
    } catch {
        $threw = $true
    }

    if ($case.Expected -and $threw) {
        throw "Expected guard case '$($case.Name)' to pass."
    }
    if (-not $case.Expected -and -not $threw) {
        throw "Expected guard case '$($case.Name)' to fail."
    }
}

Write-Host "tm staging source guard: OK ($($cases.Count) cases)"
