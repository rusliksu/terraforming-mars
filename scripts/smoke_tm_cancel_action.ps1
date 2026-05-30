param(
    [string]$Server = "https://staging.tm.knightbyte.win",
    [string]$PlayerNamePrefix = "CancelActionSmoke",
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function New-Payment {
    param(
        [int]$Megacredits
    )

    return @{
        auroraiData = 0
        floaters = 0
        heat = 0
        lunaArchivesScience = 0
        spireScience = 0
        megacredits = $Megacredits
        microbes = 0
        seeds = 0
        steel = 0
        titanium = 0
        graphene = 0
        kuiperAsteroids = 0
        plants = 0
    }
}

function New-CancelActionSmokePayload {
    param(
        [string]$PlayerName
    )

    return @{
        players = @(
            @{
                name = $PlayerName
                color = "blue"
                beginner = $false
                handicap = 0
                first = $true
                isBot = $false
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
            deltaProject = $false
        }
        board = "random official"
        seed = 0
        randomFirstPlayer = $false
        clonedGamedId = $null
        undoOption = $true
        showTimers = $false
        fastModeOption = $false
        showOtherPlayersVP = $false
        privateHands = $true
        noEloGame = $true
        turnBasedGame = $false
        botGame = $false
        aresExtremeVariant = $false
        politicalAgendasExtension = "Standard"
        solarPhaseOption = $false
        removeNegativeGlobalEventsOption = $false
        modularMA = $false
        draftVariant = $false
        initialDraft = $false
        initialDraftOneWay = $false
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
        escapeVelocity = $null
        twoCorpsVariant = $false
        customCeos = @()
        startingCeos = 0
        startingPreludes = 0
    }
}

function Invoke-PlayerInput {
    param(
        [string]$BaseServer,
        [string]$PlayerId,
        [object]$Payload
    )

    $body = $Payload | ConvertTo-Json -Depth 10 -Compress
    return Invoke-RestMethod -Method Post -Uri "$BaseServer/player/input?id=$PlayerId" -ContentType "application/json" -Body $body -TimeoutSec 30
}

function Get-OptionIndex {
    param(
        [object[]]$Options,
        [string]$Title
    )

    for ($i = 0; $i -lt $Options.Count; $i++) {
        if ($Options[$i].title -eq $Title) {
            return $i
        }
    }
    return -1
}

$Server = $Server.TrimEnd("/")
if (([System.Uri]$Server).Host -eq "tm.knightbyte.win") {
    throw "Cancel action smoke creates a disposable game and is disabled against prod."
}

$playerName = "{0}-{1}" -f $PlayerNamePrefix, (Get-Date -Format "yyyyMMddHHmmss")
$createBody = (New-CancelActionSmokePayload -PlayerName $playerName) | ConvertTo-Json -Depth 10 -Compress
$created = Invoke-RestMethod -Method Post -Uri "$Server/api/creategame" -ContentType "application/json" -Body $createBody -TimeoutSec 30

Assert-True (-not [string]::IsNullOrWhiteSpace($created.id)) "Create game response did not contain a game id."
Assert-True ($created.players.Count -eq 1) "Create game response had unexpected player count: $($created.players.Count)"

$playerId = [string]$created.players[0].id
$player = Invoke-RestMethod -Uri "$Server/api/player?id=$playerId" -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 30

Assert-True ($player.waitingFor.type -eq "initialCards") "Expected initialCards prompt, got '$($player.waitingFor.type)'."
$corpIndex = Get-OptionIndex -Options @($player.waitingFor.options) -Title "Select corporation"
$projectIndex = Get-OptionIndex -Options @($player.waitingFor.options) -Title "Select initial cards to buy"
Assert-True ($corpIndex -ge 0) "Initial cards prompt is missing corporation option."
Assert-True ($projectIndex -ge 0) "Initial cards prompt is missing project cards option."

$corporation = [string]$player.waitingFor.options[$corpIndex].cards[0].name
$initial = @{
    runId = $player.runId
    type = "initialCards"
    responses = @(
        @{
            type = "card"
            cards = @($corporation)
        },
        @{
            type = "card"
            cards = @()
        }
    )
}

$mainPrompt = Invoke-PlayerInput -BaseServer $Server -PlayerId $playerId -Payload $initial
Assert-True ($mainPrompt.game.phase -eq "action") "Expected action phase after setup, got '$($mainPrompt.game.phase)'."
Assert-True ($mainPrompt.waitingFor.type -eq "or") "Expected main action OrOptions, got '$($mainPrompt.waitingFor.type)'."
Assert-True ($mainPrompt.game.gameOptions.undoOption -eq $true) "Smoke game does not have undo enabled."

$standardProjectsIndex = Get-OptionIndex -Options @($mainPrompt.waitingFor.options) -Title "Standard projects"
Assert-True ($standardProjectsIndex -ge 0) "Main action prompt is missing Standard projects option."

$standardProjects = $mainPrompt.waitingFor.options[$standardProjectsIndex]
$greenery = @($standardProjects.cards) | Where-Object { $_.name -eq "Greenery" } | Select-Object -First 1
Assert-True ($null -ne $greenery) "Standard projects prompt is missing Greenery."

$greeneryCost = [int]($greenery.calculatedCost ?? 23)
$beforeMegacredits = [int]$mainPrompt.thisPlayer.megacredits
Assert-True ($beforeMegacredits -ge $greeneryCost) "Player has $beforeMegacredits M€ but Greenery costs $greeneryCost M€."

$greeneryInput = @{
    runId = $mainPrompt.runId
    type = "or"
    index = $standardProjectsIndex
    response = @{
        type = "projectCard"
        card = "Greenery"
        payment = New-Payment -Megacredits $greeneryCost
    }
}

$nestedPrompt = Invoke-PlayerInput -BaseServer $Server -PlayerId $playerId -Payload $greeneryInput
Assert-True ($nestedPrompt.waitingFor.type -eq "space") "Expected nested space prompt after Greenery, got '$($nestedPrompt.waitingFor.type)'."
Assert-True ([string]$nestedPrompt.waitingFor.title -eq "Select space for greenery tile") "Unexpected nested prompt title: '$($nestedPrompt.waitingFor.title)'."
Assert-True ([int]$nestedPrompt.thisPlayer.megacredits -eq ($beforeMegacredits - $greeneryCost)) "Greenery payment did not apply before cancel."

$afterCancel = Invoke-RestMethod -Method Get -Uri "$Server/reset?id=$playerId" -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 30
Assert-True ($afterCancel.waitingFor.type -eq "or") "Expected main action prompt after cancel, got '$($afterCancel.waitingFor.type)'."
Assert-True ([string]$afterCancel.waitingFor.title -like "Take your * action") "Unexpected prompt after cancel: '$($afterCancel.waitingFor.title)'."
Assert-True ([int]$afterCancel.thisPlayer.megacredits -eq $beforeMegacredits) "Cancel did not restore M€: expected $beforeMegacredits, got $($afterCancel.thisPlayer.megacredits)."
Assert-True ([int]$afterCancel.thisPlayer.actionsTakenThisRound -eq 0) "Cancel left actionsTakenThisRound=$($afterCancel.thisPlayer.actionsTakenThisRound), expected 0."

$result = [pscustomobject]@{
    server = $Server
    gameId = [string]$created.id
    playerId = $playerId
    playerUrl = "$Server/player?id=$playerId"
    selectedCorporation = $corporation
    action = "Standard projects -> Greenery"
    beforeCancel = [pscustomobject]@{
        waitingForType = [string]$nestedPrompt.waitingFor.type
        waitingForTitle = [string]$nestedPrompt.waitingFor.title
        megacredits = [int]$nestedPrompt.thisPlayer.megacredits
        actionsTakenThisRound = [int]$nestedPrompt.thisPlayer.actionsTakenThisRound
    }
    afterCancel = [pscustomobject]@{
        waitingForType = [string]$afterCancel.waitingFor.type
        waitingForTitle = [string]$afterCancel.waitingFor.title
        megacredits = [int]$afterCancel.thisPlayer.megacredits
        actionsTakenThisRound = [int]$afterCancel.thisPlayer.actionsTakenThisRound
        undoCount = [int]$afterCancel.game.undoCount
    }
}

if ($OutputJson) {
    $result | ConvertTo-Json -Depth 10
    exit 0
}

Write-Host "Cancel action smoke OK"
Write-Host "Server      : $($result.server)"
Write-Host "GameId      : $($result.gameId)"
Write-Host "PlayerId    : $($result.playerId)"
Write-Host "Corporation : $($result.selectedCorporation)"
Write-Host "Action      : $($result.action)"
Write-Host "Before      : $($result.beforeCancel.waitingForType) '$($result.beforeCancel.waitingForTitle)' MC=$($result.beforeCancel.megacredits)"
Write-Host "After       : $($result.afterCancel.waitingForType) '$($result.afterCancel.waitingForTitle)' MC=$($result.afterCancel.megacredits) undoCount=$($result.afterCancel.undoCount)"
