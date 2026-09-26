$ErrorActionPreference = "Stop"
$verifyScript = Join-Path $PSScriptRoot "verify_tm_server.ps1"
$smokeState = @{Payload = $null; Player = $null}

function Invoke-WebRequest {
    param($Uri, $Headers, $TimeoutSec)
    $content = switch (([uri]$Uri).AbsolutePath) {
        "/" { "Terraforming Mars" }
        "/elo/" { "TM ELO Ratings" }
        "/elo/data.json" { '{"players":[{}]}' }
        "/elo/elo-data.json" { '{"players":[{}]}' }
        default { throw "Unexpected web request: $Uri" }
    }
    return [pscustomobject]@{StatusCode = 200; Headers = @{"X-TM-Env" = "staging"}; Content = $content}
}

function Invoke-RestMethod {
    param($Uri, $Headers, $TimeoutSec, $Method, $ContentType, $Body)
    switch (([uri]$Uri).AbsolutePath) {
        "/release.json" { return @{artifactSha256 = ("a" * 64); packagedAtUtc = "2026-09-26T00:00:00Z"} }
        "/api/creategame" {
            $smokeState.Payload = $Body | ConvertFrom-Json
            return @{id = "g-smoke"; spectatorId = "s-smoke"; players = @(@{id = "p-smoke"}); phase = "research"}
        }
        "/api/game" { return @{id = "g-smoke"; players = @(@{name = $smokeState.Payload.players[0].name})} }
        "/api/player" {
            if (([uri]$Uri).Query -ne "?id=p-smoke") { throw "Wrong player requested: $Uri" }
            return $smokeState.Player
        }
        default { throw "Unexpected API request: $Uri" }
    }
}

$cases = @(
    @{Name = "initial selection available"; Error = $null},
    @{Name = "missing initial input"; Error = "Smoke player is not waiting for initial card selection."},
    @{Name = "empty dealt corporations"; Error = "Smoke player must be offered two corporations."},
    @{Name = "empty corporation selector"; Error = "Initial card selection must offer two corporations."}
)

foreach ($case in $cases) {
    $cards = @(@{name = "Helion"}, @{name = "Inventrix"})
    $smokeState.Payload = $null
    $smokeState.Player = @{
        id = "p-smoke"
        dealtCorporationCards = $cards
        waitingFor = @{type = "initialCards"; options = @(@{type = "card"; cards = $cards; min = 1; max = 1})}
    }
    switch ($case.Name) {
        "missing initial input" { $smokeState.Player.Remove("waitingFor") }
        "empty dealt corporations" { $smokeState.Player.dealtCorporationCards = @() }
        "empty corporation selector" { $smokeState.Player.waitingFor.options[0].cards = @() }
    }
    $failure = $null
    try {
        $result = & $verifyScript -Server "http://127.0.0.1" -CreateGame -OutputJson | ConvertFrom-Json
    } catch {
        $failure = $_.Exception.Message
    }
    if ($failure -ne $case.Error) {
        throw "Case '$($case.Name)': expected '$($case.Error)', got '$failure'."
    }
    if ($smokeState.Payload.startingCorporations -ne 2) {
        throw "Smoke must request two corporations, got $($smokeState.Payload.startingCorporations)."
    }
    if ($null -eq $case.Error -and ($result.game.corporationCount -ne 2 -or $result.game.initialInputType -ne "initialCards")) {
        throw "Successful smoke did not report the verified initial selection."
    }
}

Write-Host "tm server smoke verification: OK ($($cases.Count) cases)"
