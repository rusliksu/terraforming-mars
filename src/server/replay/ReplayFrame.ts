import {GlobalParameter} from '@/common/GlobalParameter';
import {HAZARD_CONSTRAINTS} from '@/common/ares/AresData';
import {LogMessageData} from '@/common/logs/LogMessageData';
import {CardModel} from '@/common/models/CardModel';
import {GameModel} from '@/common/models/GameModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {ReplayFrame} from '@/common/models/ReplayModel';
import {Timer} from '@/common/Timer';
import {Units} from '@/common/Units';
import {Game} from '@/server/Game';
import {Server} from '@/server/models/ServerModel';
import {SerializedGame} from '@/server/SerializedGame';

/** Selects response fields explicitly so newly added model fields stay private. */
function pick<T, K extends keyof T>(source: T, keys: ReadonlyArray<K>): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
}

function publicCard(card: CardModel): CardModel {
  return {
    ...pick(card, ['name', 'resources', 'calculatedCost', 'isSelfReplicatingRobotsCard', 'isDisabled',
      'bonusResource', 'cloneTag', 'standardProjectCanPayWith', 'warnings']),
    discount: card.discount?.map((discount) => pick(discount, ['amount', 'tag'])),
    additionalProjectCosts: card.additionalProjectCosts === undefined ? undefined :
      pick(card.additionalProjectCosts, ['thinkTankResources', 'aeronGenomicsResources', 'redsCost']),
    reserveUnits: card.reserveUnits === undefined ? undefined : pick(card.reserveUnits, Units.keys),
  };
}

function publicPlayer(player: PublicPlayerModel, timer: PublicPlayerModel['timer']): PublicPlayerModel {
  const vp = player.victoryPointsBreakdown;
  return {
    ...pick(player, ['actionsTakenThisRound', 'actionsThisGeneration', 'actionsTakenThisGame',
      'availableBlueCardActionCount', 'cardCost', 'cardDiscount', 'cardsInHandNbr', 'citiesCount', 'coloniesCount',
      'color', 'energy', 'energyProduction', 'fleetSize', 'handicap', 'heat', 'heatProduction', 'influence',
      'isActive', 'isBotControlled', 'isSurrendered', 'lastCardPlayed', 'megacredits', 'megacreditProduction',
      'name', 'needsToDraft', 'needsToResearch', 'noTagsCount', 'plants', 'plantProduction', 'steel',
      'steelProduction', 'steelValue', 'tags', 'terraformRating', 'titanium', 'titaniumProduction',
      'titaniumValue', 'tradesThisGeneration', 'victoryPointsByGeneration']),
    id: undefined,
    alliedParty: player.alliedParty === undefined ? undefined : {
      partyName: player.alliedParty.partyName,
      agenda: pick(player.alliedParty.agenda, ['bonusId', 'policyId']),
    },
    deltaProject: player.deltaProject === undefined ? undefined : pick(player.deltaProject, ['position', 'jovianBonus']),
    tableau: player.tableau.map(publicCard),
    selfReplicatingRobotsCards: player.selfReplicatingRobotsCards.map(publicCard),
    protectedResources: pick(player.protectedResources, Units.keys),
    protectedProduction: pick(player.protectedProduction, Units.keys),
    timer: {...pick(timer, ['sumElapsed', 'startedAt', 'afterFirstAction', 'lastStoppedAt']), running: false},
    underworldData: {
      corruption: player.underworldData.corruption,
      activeBonus: player.underworldData.activeBonus,
      tokens: player.underworldData.tokens.map((token) => pick(token, ['token', 'shelter', 'active'])),
    },
    globalParameterSteps: pick(player.globalParameterSteps, Object.values(GlobalParameter)),
    victoryPointsBreakdown: {
      ...pick(vp, ['terraformRating', 'milestones', 'awards', 'greenery', 'city', 'escapeVelocity', 'moonHabitats',
        'moonMines', 'moonRoads', 'planetaryTracks', 'victoryPoints', 'total', 'negativeVP']),
      detailsCards: vp.detailsCards.map((card) => pick(card, ['cardName', 'victoryPoint'])),
      detailsMilestones: vp.detailsMilestones.map((detail) => pick(detail, ['message', 'messageArgs', 'victoryPoint'])),
      detailsAwards: vp.detailsAwards.map((detail) => pick(detail, ['message', 'messageArgs', 'victoryPoint'])),
      detailsPlanetaryTracks: vp.detailsPlanetaryTracks.map((detail) => pick(detail, ['tag', 'points'])),
    },
  };
}

function publicGame(game: GameModel): GameModel {
  const ares = game.aresData;
  return {
    ...pick(game, ['awards', 'colonies', 'deckSize', 'discardPileSize', 'discardedColonies', 'gameAge', 'gameId',
      'inputSeq', 'generation', 'isSoloModeWin', 'isTerraformed', 'lastSoloGeneration', 'milestones',
      'name', 'oceans', 'oxygenLevel', 'passedPlayers', 'pathfinders', 'phase', 'spaces', 'spectatorId',
      'step', 'temperature', 'tags', 'undoCount', 'venusScaleLevel']),
    expectedPurgeTimeMs: 0,
    globalsPerGeneration: game.globalsPerGeneration.map((generation) => pick(generation, Object.values(GlobalParameter))),
    aresData: ares === undefined ? undefined : {
      includeHazards: ares.includeHazards,
      hazardData: Object.fromEntries(HAZARD_CONSTRAINTS.map((key) => [key,
        pick(ares.hazardData[key], ['threshold', 'available'])])) as typeof ares.hazardData,
      milestoneResults: [],
    },
    gameOptions: {
      ...pick(game.gameOptions, ['altVenusBoard', 'aresExtremeVariant', 'boardName', 'bannedCards', 'expansions',
        'draftVariant', 'fastModeOption', 'includedCards', 'includeFanMA', 'initialDraftVariant', 'initialDraftOneWay',
        'noEloGame', 'turnBasedGame', 'preludeDraftVariant', 'ceosDraftVariant', 'politicalAgendasExtension',
        'removeNegativeGlobalEvents', 'showOtherPlayersVP', 'showTimers', 'shuffleMapOption', 'solarPhaseOption',
        'soloTR', 'randomMA', 'requiresMoonTrackCompletion', 'requiresVenusTrackCompletion', 'twoCorpsVariant']),
      escapeVelocity: game.gameOptions.escapeVelocity === undefined ? undefined :
        pick(game.gameOptions.escapeVelocity, ['thresholdMinutes', 'bonusSectionsPerAction', 'penaltyPeriodMinutes', 'penaltyVPPerPeriod']),
      privateHands: true,
      undoOption: false,
      undoStepOption: false,
    },
    moon: game.moon === undefined ? undefined : pick(game.moon, ['spaces', 'habitatRate', 'miningRate', 'logisticRate']),
    turmoil: game.turmoil === undefined ? undefined : {
      ...pick(game.turmoil, ['chairman', 'ruling', 'dominant', 'parties', 'lobby', 'reserve', 'distant', 'coming', 'current', 'policyActionUsers']),
      politicalAgendas: game.turmoil.politicalAgendas === undefined ? undefined : {
        marsFirst: pick(game.turmoil.politicalAgendas.marsFirst, ['bonusId', 'policyId']),
        scientists: pick(game.turmoil.politicalAgendas.scientists, ['bonusId', 'policyId']),
        unity: pick(game.turmoil.politicalAgendas.unity, ['bonusId', 'policyId']),
        greens: pick(game.turmoil.politicalAgendas.greens, ['bonusId', 'policyId']),
        reds: pick(game.turmoil.politicalAgendas.reds, ['bonusId', 'policyId']),
        kelvinists: pick(game.turmoil.politicalAgendas.kelvinists, ['bonusId', 'policyId']),
      },
    },
  };
}

/** Builds a public frame without resuming the game or exposing the stored JSON. */
export function toReplayFrame(saved: SerializedGame): ReplayFrame {
  const game = Game.deserialize(saved, {viewOnly: true});
  const timers = Object.fromEntries(saved.players.map((player) => [player.color, player.timer] as const));
  for (const [index, player] of game.players.entries()) {
    player.timer = Timer.deserialize({...saved.players[index].timer, running: false}, false);
  }
  const model = Server.getSpectatorModel(game);
  return {
    saveId: saved.lastSaveId,
    view: {id: game.spectatorId, color: 'neutral', runId: 'replay', thisPlayer: undefined,
      game: publicGame(model.game), players: model.players.map((player) => publicPlayer(player, timers[player.color]))},
    logs: game.gameLog
      .filter((message) => message.playerId === undefined && !message.hiddenFor?.includes(game.spectatorId))
      .map((message) => ({
        ...pick(message, ['type', 'message', 'timestamp', 'canceled']),
        data: message.data.map((datum) => ({
          type: datum.type, value: datum.value,
          attrs: datum.attrs === undefined ? undefined : pick(datum.attrs, ['tags', 'cost', 'ellipsis']),
        } as LogMessageData)),
      })),
  };
}
