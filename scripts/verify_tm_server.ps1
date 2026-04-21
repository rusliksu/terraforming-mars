param(
    [string]$Server,
    [ValidateSet("staging", "prod", "preview")]
    [string]$Environment = "staging",
    [string]$GameNamePrefix = "TMVerify",
    [switch]$CreateGame,
    [switch]$RequireReleaseManifest,
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Server)) {
    $Server = switch ($Environment) {
        "staging" { "https://staging.tm.knightbyte.win" }
        "preview" { "https://preview.tm.knightbyte.win" }
        default { "https://tm.knightbyte.win" }
    }
}

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Get-HeaderValue {
    param(
        [object]$Headers,
        [string]$Name
    )

    if ($Headers -is [System.Collections.IDictionary]) {
        return [string]$Headers[$Name]
    }

    $property = $Headers.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return ""
    }
    return [string]$property.Value
}

function Get-ReleaseManifest {
    param(
        [string]$BaseServer
    )

    $candidates = @(
        "$BaseServer/assets/release.json",
        "$BaseServer/release.json"
    )
    $errors = New-Object System.Collections.Generic.List[string]

    foreach ($uri in $candidates) {
        try {
            return [pscustomobject]@{
                url = $uri
                manifest = Invoke-RestMethod -Uri $uri -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 30
            }
        } catch {
            $errors.Add(("{0}: {1}" -f $uri, $_.Exception.Message))
        }
    }

    throw "Release manifest check failed. Tried: $($errors -join ' | ')"
}

function New-SmokeGamePayload {
    param(
        [string]$Name
    )

    return @{
        players = @(
            @{
                name = $Name
                color = "blue"
                beginner = $false
                handicap = 0
                first = $true
            }
        )
        expansions = @{
            corpera = $true
            promo = $false
            venus = $false
            colonies = $false
            prelude = $false
            prelude2 = $false
            turmoil = $false
            community = $false
            ares = $false
            moon = $false
            pathfinders = $false
            ceo = $false
            starwars = $false
            underworld = $false
        }
        board = "random official"
        seed = 0
        randomFirstPlayer = $false
        undoOption = $false
        showTimers = $false
        fastModeOption = $false
        showOtherPlayersVP = $false
        aresExtremeVariant = $false
        politicalAgendasExtension = "Standard"
        solarPhaseOption = $false
        removeNegativeGlobalEventsOption = $false
        modularMA = $false
        draftVariant = $false
        initialDraft = $false
        preludeDraftVariant = $false
        ceosDraftVariant = $false
        startingCorporations = 0
        shuffleMapOption = $false
        randomMA = "No randomization"
        includeFanMA = $false
        soloTR = $false
        customCorporationsList = @()
        bannedCards = @()
        includedCards = @()
        customColoniesList = @()
        customPreludes = @()
        requiresMoonTrackCompletion = $false
        requiresVenusTrackCompletion = $false
        moonStandardProjectVariant = $false
        moonStandardProjectVariant1 = $false
        altVenusBoard = $false
        twoCorpsVariant = $false
        customCeos = @()
        startingCeos = 0
        startingPreludes = 0
    }
}

$expectedEnvHeader = switch ($Environment) {
    "staging" { "staging" }
    "preview" { "preview" }
    default { "" }
}
$expectedBadge = ($Environment -eq "staging")

$homeResponse = Invoke-WebRequest -Uri "$Server/" -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 30
Assert-True ($homeResponse.StatusCode -eq 200) "Home page returned $($homeResponse.StatusCode), expected 200."

$envHeader = Get-HeaderValue -Headers $homeResponse.Headers -Name "X-TM-Env"
if ($Environment -in @("staging", "preview")) {
    Assert-True ($envHeader -eq $expectedEnvHeader) "Home page is missing X-TM-Env=$expectedEnvHeader."
} else {
    Assert-True ([string]::IsNullOrWhiteSpace($envHeader)) "Prod unexpectedly returned X-TM-Env=$envHeader."
}

$hasBadge = ($homeResponse.Content -match "tm-env-badge")
if ($expectedBadge) {
    Assert-True $hasBadge "Home page does not contain the staging badge markup."
}

$elo = Invoke-WebRequest -Uri "$Server/elo/" -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 30
Assert-True ($elo.StatusCode -eq 200) "ELO page returned $($elo.StatusCode), expected 200."
Assert-True ($elo.Content -match "TM ELO Ratings") "ELO page content check failed."

$releaseManifestInfo = $null
$releaseManifest = $null
try {
    $releaseManifestInfo = Get-ReleaseManifest -BaseServer $Server
    $releaseManifest = $releaseManifestInfo.manifest
} catch {
    if ($RequireReleaseManifest) {
        throw $_
    }
}

if ($null -ne $releaseManifest) {
    Assert-True (-not [string]::IsNullOrWhiteSpace([string]$releaseManifest.artifactSha256)) "Release manifest is missing artifactSha256."
    Assert-True (-not [string]::IsNullOrWhiteSpace([string]$releaseManifest.packagedAtUtc)) "Release manifest is missing packagedAtUtc."
}

$gameResult = $null
if ($CreateGame) {
    $gameName = "{0}-{1}" -f $GameNamePrefix, (Get-Date -Format "yyyyMMddHHmmss")
    $payload = New-SmokeGamePayload -Name $gameName
    $body = $payload | ConvertTo-Json -Depth 6 -Compress
    $create = Invoke-RestMethod -Method Post -Uri "$Server/api/creategame" -ContentType "application/json" -Body $body -TimeoutSec 30

    Assert-True (-not [string]::IsNullOrWhiteSpace($create.id)) "Create game response did not contain a game id."
    Assert-True ($create.id.StartsWith("g")) "Create game response had unexpected game id: $($create.id)"
    Assert-True ($create.spectatorId.StartsWith("s")) "Create game response had unexpected spectator id: $($create.spectatorId)"
    Assert-True ($create.players.Count -eq 1) "Create game response had unexpected player count: $($create.players.Count)"
    Assert-True ($create.players[0].id.StartsWith("p")) "Create game response had unexpected player id: $($create.players[0].id)"

    $game = Invoke-RestMethod -Uri "$Server/api/game?id=$($create.id)" -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 30
    Assert-True ($game.id -eq $create.id) "api/game returned unexpected game id."
    Assert-True ($game.players[0].name -eq $gameName) "api/game returned unexpected player name."

    $gameResult = [pscustomobject]@{
        id = $create.id
        playerId = $create.players[0].id
        spectatorId = $create.spectatorId
        playerName = $gameName
        phase = $create.phase
        playerUrl = "$Server/player?id=$($create.players[0].id)"
        spectatorUrl = "$Server/spectator?id=$($create.spectatorId)"
    }
}

$result = [pscustomobject]@{
    server = $Server
    environment = $Environment
    home = [pscustomobject]@{
        status = $homeResponse.StatusCode
        env = $envHeader
        hasBadge = $hasBadge
    }
    elo = [pscustomobject]@{
        status = $elo.StatusCode
        titleMatched = ($elo.Content -match "TM ELO Ratings")
    }
    release = if ($null -eq $releaseManifest) {
        $null
    } else {
        [pscustomobject]@{
            url = [string]$releaseManifestInfo.url
            artifactSha256 = [string]$releaseManifest.artifactSha256
            gitSha = [string]$releaseManifest.gitSha
            gitBranch = [string]$releaseManifest.gitBranch
            buildMainJsMtimeUtc = [string]$releaseManifest.buildMainJsMtimeUtc
            packagedAtUtc = [string]$releaseManifest.packagedAtUtc
        }
    }
    game = $gameResult
}

if ($OutputJson) {
    $result | ConvertTo-Json -Depth 10
    exit 0
}

Write-Host "$($Environment.Substring(0,1).ToUpper() + $Environment.Substring(1)) verify OK"
Write-Host "Server      : $($result.server)"
Write-Host "Home        : $($result.home.status) X-TM-Env=$($result.home.env) badge=$($result.home.hasBadge)"
Write-Host "ELO         : $($result.elo.status) title matched"
if ($null -ne $result.release) {
    Write-Host "Release     : sha256=$($result.release.artifactSha256) git=$($result.release.gitSha)"
}
if ($null -ne $result.game) {
    Write-Host "GameId      : $($result.game.id)"
    Write-Host "PlayerId    : $($result.game.playerId)"
    Write-Host "SpectatorId : $($result.game.spectatorId)"
    Write-Host "Phase       : $($result.game.phase)"
    Write-Host "Player URL  : $($result.game.playerUrl)"
    Write-Host "Spectator   : $($result.game.spectatorUrl)"
}
