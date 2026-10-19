import {Phase} from '../common/Phase';
import {SerializedClaimedMilestone} from './milestones/ClaimedMilestone';
import {SerializedFundedAward} from './awards/FundedAward';
import {DeferredAction} from './deferredActions/DeferredAction';
import {SerializedColony} from './SerializedColony';
import {SerializedPlayer} from './SerializedPlayer';
import {SerializedTurmoil} from './turmoil/SerializedTurmoil';
import {PlayerId, GameId, SpectatorId, SpaceId} from '../common/Types';
import {GameOptions} from './game/GameOptions';
import {AresData} from '../common/ares/AresData';
import {LogMessage} from '../common/logs/LogMessage';
import {SerializedBoard} from './boards/SerializedBoard';
import {SerializedMoonData} from './moon/SerializedMoonData';
import {SerializedVenusPhase2Data} from './venusPhase2/SerializedVenusPhase2Data';
import {SerializedPathfindersData} from './pathfinders/SerializedPathfindersData';
import {SerializedDeck} from './cards/SerializedDeck';
import {UnderworldData} from './underworld/UnderworldData';
import {ConglomeratesData} from './conglomerates/ConglomeratesData';
import {AwardName} from '../common/ma/AwardName';
import {GlobalParameter} from '../common/GlobalParameter';
import {HighOrbitMarketRow} from '../common/highOrbit/HighOrbitMarket';
import {MilestoneName} from '../common/ma/MilestoneName';
import {Tag} from '../common/cards/Tag';
import {CardName} from '../common/cards/CardName';

/** Return state for a research phase that interrupts an action turn. */
export type AdditionalResearch = {
    phase: Phase;
    draftRound: number;
    pending: boolean;
    exchangedPlayers: Array<PlayerId>;
};

export type SerializedGame = {
    additionalResearch?: AdditionalResearch;
    activePlayer: PlayerId;
    aresData?: AresData;
    awards: Array<AwardName>;
    beholdTheEmperor?: boolean;
    backstabbingPlayer?: PlayerId;
    board: SerializedBoard;
    botPlayerIds?: Array<PlayerId>;
    surrenderedPlayerIds?: Array<PlayerId>;
    // High Orbit (fan): see IGame.cardsPlayedThisGeneration. Optional for backward compatibility
    // with saves from before this field existed.
    cardsPlayedThisGeneration?: Array<CardName>;
    // High Orbit (fan): see IGame.highOrbitMarket / IGame.highOrbitDeck. Optional for backward
    // compatibility with saves from before this field existed (or from the old flat-map shape).
    highOrbitMarket?: Array<HighOrbitMarketRow>;
    highOrbitDeck?: Array<CardName>;
    // Solaris (fan): see IGame.resourceRemovalBlockedThisGeneration. Optional for backward
    // compatibility with saves from before this field existed.
    resourceRemovalBlockedThisGeneration?: boolean;
    ceoDeck: SerializedDeck;
    currentSeed: number;
    claimedMilestones: Array<SerializedClaimedMilestone>;
    clonedGamedId?: string;
    colonies: Array<SerializedColony>;
    corporationDeck: SerializedDeck,
    createdTimeMs: number;
    deferredActions: Array<DeferredAction>;
    donePlayers: Array<PlayerId>;
    draftRound: number;
    exploitationOfVenusInEffect: boolean;
    first: PlayerId;
    fundedAwards: Array<SerializedFundedAward>;
    gagarinBase: Array<SpaceId>;
    gameAge: number;
    shadowInputSeq: number;
    gameLog: Array<LogMessage>;
    gameOptions: GameOptions;
    generation: number;
    globalsPerGeneration: Array<Partial<Record<GlobalParameter, number>>>;
    id: GameId;
    initialDraftIteration: number;
    lastSaveId: number;
    milestones: Array<MilestoneName>;
    moonData: SerializedMoonData | undefined;
    name: string;
    nomadSpace: SpaceId | undefined;
    pathfindersData: SerializedPathfindersData | undefined;
    oxygenLevel: number;
    passedPlayers: Array<PlayerId>;
    phase: Phase;
    players: Array<SerializedPlayer>;
    preludeDeck: SerializedDeck,
    projectDeck: SerializedDeck,
    researchedPlayers: Array<PlayerId>;
    seed: number;
    someoneHasRemovedOtherPlayersPlants: boolean;
    spectatorId: SpectatorId;
    stJosephCathedrals: Array<SpaceId>;
    syndicatePirateRaider: PlayerId | undefined;
    tags: ReadonlyArray<Tag>
    temperature: number;
    tradeEmbargo?: boolean;
    turmoil?: SerializedTurmoil;
    undoCount: number;
    underworldData: UnderworldData;
    conglomerates?: ConglomeratesData;
    venusPhase2Data: SerializedVenusPhase2Data | undefined;
    venusScaleLevel: number;
    verminInEffect: boolean;
}
