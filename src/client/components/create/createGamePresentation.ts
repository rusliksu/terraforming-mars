import type {CreateGameModel} from './CreateGameModel';
import {BoardName} from '@/common/boards/BoardName';
import type {CreateModelView, ScalarCreateField} from '@/client/wrybit/create/controlledFields';

/** Explicit data projection; component instances and methods never enter the view model. */
export function projectCreateModel(owner: CreateGameModel): CreateModelView {
  return {
    allOfficialExpansions: owner.allOfficialExpansions,
    altVenusBoard: owner.altVenusBoard,
    aresExtremeVariant: owner.aresExtremeVariant,
    bannedCards: owner.bannedCards,
    board: owner.board ?? owner.boards[0] ?? BoardName.THARSIS,
    boards: owner.boards,
    botGame: owner.botGame,
    ceosDraftVariant: owner.ceosDraftVariant,
    clonedGameId: owner.clonedGameId,
    customBoardCode: owner.customBoardCode,
    customMoonBoardCode: owner.customMoonBoardCode,
    customVenusSurfaceBoardCode: owner.customVenusSurfaceBoardCode,
    customCeos: owner.customCeos,
    customColonies: owner.customColonies,
    customCorporations: owner.customCorporations,
    customMA: owner.customMA,
    customPreludes: owner.customPreludes,
    draftVariant: owner.draftVariant,
    escapeVelocityBonusSeconds: owner.escapeVelocityBonusSeconds,
    escapeVelocityMode: owner.escapeVelocityMode,
    escapeVelocityPenalty: owner.escapeVelocityPenalty,
    escapeVelocityPeriod: owner.escapeVelocityPeriod,
    escapeVelocityThreshold: owner.escapeVelocityThreshold,
    expansions: owner.expansions,
    fastModeOption: owner.fastModeOption,
    firstIndex: owner.firstIndex,
    includedCards: owner.includedCards,
    includeFanMA: owner.includeFanMA,
    initialDraft: owner.initialDraft,
    initialDraftOneWay: owner.initialDraftOneWay,
    modularMA: owner.modularMA,
    moonStandardProjectVariant: owner.moonStandardProjectVariant,
    moonStandardProjectVariant1: owner.moonStandardProjectVariant1,
    noEloGame: owner.noEloGame,
    privateHands: owner.privateHands,
    requiresDiscordLogin: owner.requiresDiscordLogin,
    players: owner.players,
    playersCount: owner.playersCount,
    politicalAgendasExtension: owner.politicalAgendasExtension,
    preludeDraftVariant: owner.preludeDraftVariant,
    randomFirstPlayer: owner.randomFirstPlayer,
    randomMA: owner.randomMA,
    removeNegativeGlobalEventsOption: owner.removeNegativeGlobalEventsOption,
    requiresMoonTrackCompletion: owner.requiresMoonTrackCompletion,
    requiresVenusTrackCompletion: owner.requiresVenusTrackCompletion,
    seed: owner.seed,
    seededGame: owner.seededGame,
    showBannedCards: owner.showBannedCards,
    showCeosList: owner.showCeosList,
    showColoniesList: owner.showColoniesList,
    showCorporationList: owner.showCorporationList,
    showIncludedCards: owner.showIncludedCards,
    showOtherPlayersVP: owner.showOtherPlayersVP,
    showPreludesList: owner.showPreludesList,
    showTimers: owner.showTimers,
    shuffleMapOption: owner.shuffleMapOption,
    solarPhaseOption: owner.solarPhaseOption,
    soloTR: owner.soloTR,
    startingCeos: owner.startingCeos,
    startingCorporations: owner.startingCorporations,
    startingPreludes: owner.startingPreludes,
    turnBasedGame: owner.turnBasedGame,
    twoCorpsVariant: owner.twoCorpsVariant,
    undoOption: owner.undoOption,
    undoStepOption: owner.undoStepOption,
  };
}

export function setCreateField<K extends ScalarCreateField>(owner: CreateGameModel, key: K, value: CreateGameModel[K]): void {
  if (key === 'board') {
    const board = value as BoardName;
    owner.board = board;
    owner.boards = [board];
    return;
  }
  (owner as unknown as Record<string, unknown>)[key as string] = value;
}
