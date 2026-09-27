import * as constants from '../../common/constants';
import {BoardName} from '../../common/boards/BoardName';
import {RandomBoardOption} from '../../common/boards/RandomBoardOption';
import {CardName} from '../../common/cards/CardName';
import {ColonyName} from '../../common/colonies/ColonyName';
import {GameId} from '../../common/Types';
import {RandomMAOptionType} from '../../common/ma/RandomMAOptionType';
import {AgendaStyle} from '../../common/turmoil/Types';
import {Expansion} from '../../common/cards/GameModule';
import {EscapeVelocityOptions} from '../../common/game/NewGameConfig';
import {CustomBoardDefinition} from '../../common/boards/CustomBoardDefinition';
import {SimpleCustomBoardDefinition} from '../../common/boards/SimpleCustomBoardDefinition';
import {GlobalParametersConfig} from '../../common/GlobalParameterConfig';

export type GameOptions = {
  /** The resolved runtime board for this game. */
  boardName: BoardName;
  /** The original create-game board selection, used by rematch setup. */
  boardSelection?: BoardName | RandomBoardOption;
  /** The board layout when `boardName` is `BoardName.CUSTOM`. Persisted for the life of the game. */
  customBoard?: CustomBoardDefinition;
  /** A user-authored Moon surface layout. Absent means MoonBoard's own hard-coded default. */
  customMoonBoard?: SimpleCustomBoardDefinition;
  /** A user-authored Venus surface layout. Absent means VenusSurfaceBoard's own hard-coded default. */
  customVenusSurfaceBoard?: SimpleCustomBoardDefinition;
  /** Global-parameter track overrides (from a custom board). Absent means the official tracks. */
  globalParameters?: GlobalParametersConfig;
  clonedGamedId: GameId | undefined;

  // Configuration
  undoOption: boolean;
  undoStepOption: boolean;
  showTimers: boolean;
  fastModeOption: boolean;
  showOtherPlayersVP: boolean;
  privateHands: boolean;
  noEloGame: boolean;
  turnBasedGame: boolean;

  // Extensions -- Deprecated, except when importing JSON
  corporateEra: boolean;
  venusNextExtension: boolean;
  coloniesExtension: boolean;
  preludeExtension: boolean;
  prelude2Expansion: boolean;
  turmoilExtension: boolean;
  promoCardsOption: boolean;
  communityCardsOption: boolean;
  aresExtension: boolean;
  aresHazards: boolean;
  aresExtremeVariant: boolean;
  politicalAgendasExtension: AgendaStyle;
  solarPhaseOption: boolean;
  removeNegativeGlobalEventsOption: boolean;
  moonExpansion: boolean;
  pathfindersExpansion: boolean;
  ceoExtension: boolean;
  starWarsExpansion: boolean;
  underworldExpansion: boolean;
  deltaProjectExpansion: boolean;
  sillyficationExpansion: boolean;
  betterMarsExpansion: boolean;
  customCardsExpansion: boolean;
  conglomeratesExpansion: boolean;
  corporateBettermentsExpansion: boolean;
  idesOfMarsExpansion: boolean;
  robAntillesExpansion: boolean;
  morePartiesExpansion: boolean;
  venusPhase2Expansion: boolean;
  industriesExpansion: boolean;
  highOrbitExpansion: boolean;
  solarisExpansion: boolean;
  /** One team-index per player (same order as the player list), chosen at game creation. Undefined falls back to pairing by table order. */
  conglomeratesTeamAssignments: Array<number> | undefined;

  expansions: Record<Expansion, boolean>,

  // Variants
  draftVariant: boolean;
  initialDraftVariant: boolean;
  initialDraftOneWay: boolean;
  preludeDraftVariant: boolean;
  ceosDraftVariant: boolean;
  // corporationsDraft: boolean;
  startingCorporations: number;
  shuffleMapOption: boolean;
  randomMA: RandomMAOptionType;
  includeFanMA: boolean;
  modularMA: boolean;
  /** Solo victory by getting TR 63 by game end */
  soloTR: boolean;
  customCorporationsList: ReadonlyArray<CardName>;
  bannedCards: ReadonlyArray<CardName>;
  includedCards: ReadonlyArray<CardName>;
  customColoniesList: ReadonlyArray<ColonyName>;
  customPreludes: ReadonlyArray<CardName>;
  customCeos: ReadonlyArray<CardName>;
  startingCeos: number;
  startingPreludes: number;
  /** Moon must be completed to end the game */
  requiresMoonTrackCompletion: boolean;
  /** Venus must be completed to end the game */
  requiresVenusTrackCompletion: boolean;
  /** Standard projects cost more MC and do not require steel or titanium */
  moonStandardProjectVariant: boolean;
  /** Standard projects can be paid for with steel or titanium at a 1MC loss per alloy */
  moonStandardProjectVariant1: boolean;
  altVenusBoard: boolean;
  escapeVelocity?: EscapeVelocityOptions;
  twoCorpsVariant: boolean;
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  altVenusBoard: false,
  aresExtension: false,
  aresHazards: true,
  aresExtremeVariant: false,
  boardName: BoardName.THARSIS,
  customBoard: undefined,
  customMoonBoard: undefined,
  customVenusSurfaceBoard: undefined,
  globalParameters: undefined,
  bannedCards: [],
  includedCards: [],
  ceoExtension: false,
  clonedGamedId: undefined,
  coloniesExtension: false,
  communityCardsOption: false,
  corporateEra: true,
  customCeos: [],
  customColoniesList: [],
  customCorporationsList: [],
  customPreludes: [],
  draftVariant: false,
  escapeVelocity: undefined,
  expansions: {
    corpera: false,
    promo: false,
    venus: false,
    colonies: false,
    prelude: false,
    prelude2: false,
    turmoil: false,
    community: false,
    ares: false,
    moon: false,
    pathfinders: false,
    ceo: false,
    starwars: false,
    underworld: false,
    deltaProject: false,
    sillyfication: false,
    betterMars: false,
    customCards: false,
    conglomerates: false,
    corporateBetterments: false,
    idesOfMars: false,
    robAntilles: false,
    moreParties: false,
    venusPhase2: false,
    industries: false,
    highOrbit: false,
    solaris: false,
  },
  fastModeOption: false,
  includeFanMA: false,
  initialDraftVariant: false,
  initialDraftOneWay: false,
  modularMA: false,
  noEloGame: false,
  turnBasedGame: false,
  moonExpansion: false,
  moonStandardProjectVariant: false,
  moonStandardProjectVariant1: false,
  pathfindersExpansion: false,
  privateHands: true,
  politicalAgendasExtension: 'Standard',
  preludeDraftVariant: false,
  ceosDraftVariant: false,
  preludeExtension: false,
  prelude2Expansion: false,
  promoCardsOption: false,
  randomMA: RandomMAOptionType.NONE,
  requiresMoonTrackCompletion: false,
  removeNegativeGlobalEventsOption: false,
  requiresVenusTrackCompletion: false,
  showOtherPlayersVP: false,
  showTimers: true,
  shuffleMapOption: false,
  solarPhaseOption: false,
  soloTR: false,
  startingCeos: constants.CEO_CARDS_DEALT_PER_PLAYER,
  startingCorporations: constants.CORPORATION_CARDS_DEALT_PER_PLAYER,
  startingPreludes: constants.PRELUDE_CARDS_DEALT_PER_PLAYER,
  starWarsExpansion: false,
  turmoilExtension: false,
  underworldExpansion: false,
  deltaProjectExpansion: false,
  sillyficationExpansion: false,
  betterMarsExpansion: false,
  customCardsExpansion: false,
  conglomeratesExpansion: false,
  corporateBettermentsExpansion: false,
  idesOfMarsExpansion: false,
  robAntillesExpansion: false,
  morePartiesExpansion: false,
  venusPhase2Expansion: false,
  industriesExpansion: false,
  highOrbitExpansion: false,
  solarisExpansion: false,
  conglomeratesTeamAssignments: undefined,
  undoOption: false,
  undoStepOption: false,
  venusNextExtension: false,
  twoCorpsVariant: false,
};
