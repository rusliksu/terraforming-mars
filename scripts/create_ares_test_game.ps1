param(
    [string]$Server = "https://tm.knightbyte.win",
    [string]$Board = "tharsis",
    [string]$GameNamePrefix = "AresTest",
    [switch]$NoPrelude,
    [switch]$NoPromo,
    [ValidateSet("spectator", "player1", "player2", "player3")]
    [string]$Open,
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

function New-Player {
    param(
        [string]$Name,
        [string]$Color,
        [bool]$First = $false
    )

    return @{
        name = $Name
        color = $Color
        beginner = $false
        handicap = 0
        first = $First
    }
}

$payload = @{
    players = @(
        (New-Player -Name "${GameNamePrefix}1" -Color "blue" -First $true),
        (New-Player -Name "${GameNamePrefix}2" -Color "red"),
        (New-Player -Name "${GameNamePrefix}3" -Color "green")
    )
    expansions = @{
        corpera = $true
        promo = -not $NoPromo
        venus = $false
        colonies = $false
        prelude = -not $NoPrelude
        prelude2 = $false
        turmoil = $false
        community = $false
        ares = $true
        moon = $false
        pathfinders = $false
        ceo = $false
        starwars = $false
        underworld = $false
    }
    board = $Board
    seed = 0
    randomFirstPlayer = $false
    undoOption = $false
    showTimers = $true
    fastModeOption = $false
    showOtherPlayersVP = $false
    aresExtremeVariant = $false
    politicalAgendasExtension = "Standard"
    solarPhaseOption = $true
    removeNegativeGlobalEventsOption = $false
    modularMA = $false
    draftVariant = $true
    initialDraft = $false
    preludeDraftVariant = $false
    ceosDraftVariant = $false
    startingCorporations = 2
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
    startingPreludes = 4
}

$body = $payload | ConvertTo-Json -Depth 6 -Compress
$response = Invoke-RestMethod `
    -Method Post `
    -Uri "$Server/api/creategame" `
    -ContentType "application/json" `
    -Body $body

if ($OutputJson) {
    $response | ConvertTo-Json -Depth 10
    exit 0
}

$playerLinks = @()
foreach ($player in $response.players) {
    $playerLinks += [pscustomobject]@{
        Name = $player.name
        Color = $player.color
        PlayerId = $player.id
        Url = "$Server?id=$($response.id)&playerId=$($player.id)"
    }
}

$spectatorUrl = "$Server?id=$($response.id)&spectatorId=$($response.spectatorId)"

Write-Host "GameId      : $($response.id)"
Write-Host "SpectatorId : $($response.spectatorId)"
Write-Host "Phase       : $($response.phase)"
Write-Host "ActiveColor : $($response.activePlayer)"
Write-Host "Board       : $($response.gameOptions.boardName)"
Write-Host "Ares        : $($response.gameOptions.expansions.ares)"
Write-Host ""
Write-Host "Spectator URL:"
Write-Host $spectatorUrl
Write-Host ""
Write-Host "Players:"
$playerLinks | Format-Table -AutoSize

Write-Host ""
Write-Host "Quick copy:"
Write-Host "Player1Url  : $($playerLinks[0].Url)"
Write-Host "Player2Url  : $($playerLinks[1].Url)"
Write-Host "Player3Url  : $($playerLinks[2].Url)"
Write-Host "SpectatorUrl: $spectatorUrl"

if ($Open) {
    $targetUrl = switch ($Open) {
        "spectator" { $spectatorUrl }
        "player1" { $playerLinks[0].Url }
        "player2" { $playerLinks[1].Url }
        "player3" { $playerLinks[2].Url }
    }
    Start-Process $targetUrl
}
