import {GameId, JSONValue} from '../../common/Types';
import {ActionIntent, ActionStream, GenesisSnapshotRecord, IActionStore} from '../actionStore';
import {ActionEnginePort, ActionEngineState} from '../actionGateway/ActionEnginePort';
import {GenesisBinding, bindGenesis, stateHashOf} from '../actionGateway/StateBinding';
import {IGame} from '../IGame';
import {SerializedGame} from '../SerializedGame';
import {ActionRecoveryError, CHECKPOINT_SUPPORT} from './ActionRecoveryError';
import {ReplayPlan, planReplay, replayPlan} from './ActionReplay';

/** Page size for journal reads; the store caps a page at 1000. */
const INTENT_PAGE_SIZE = 500;

export type ActionRecoveryOptions = {
  store: IActionStore;
  engine: ActionEnginePort;
};

export type StreamGenesis = Pick<GenesisBinding, 'genesisId' | 'baseSaveId' | 'stateHash'>;

export type StreamOpenResult = {
  stream: ActionStream;
  genesis: StreamGenesis;
  /** True when this call created the stream anchor. */
  opened: boolean;
};

export type RecoveryRequest = {
  gameId: GameId;
  /**
   * Live game used only to seed or repair the genesis anchor. It is never
   * replayed: the journal, not the mutable live save, is authoritative.
   */
  liveGame?: IGame;
  /**
   * Checkpoints are rejected until an exact deferred/waiting-for continuation
   * can be proven; see {@link CHECKPOINT_SUPPORT}.
   */
  checkpoint?: unknown;
  /** Effective revision whose state must be captured too (undo target). */
  captureRevision?: number;
};

export type RecoveredState = {
  stream: ActionStream;
  /** Effective head revision. */
  revision: number;
  state: ActionEngineState;
  stateHash: string;
  plan: ReplayPlan;
  /** Intents whose recorded prompt the engine reproduced during replay. */
  verifiedPrompts: number;
  capturedState?: ActionEngineState;
  capturedStateHash?: string;
};

function bindingOf(stream: ActionStream): StreamGenesis {
  return {genesisId: stream.genesisId, baseSaveId: stream.baseSaveId, stateHash: stream.stateHash};
}

/**
 * Deep JSON copy of a serialized game.
 *
 * `Game.serialize` leaves optional fields as `undefined`, which the canonical
 * JSON writer rejects on purpose. Storing the JSON projection also guarantees
 * that a later mutation of the live game cannot rewrite the stored anchor.
 */
function jsonSnapshot(snapshot: SerializedGame): JSONValue {
  return JSON.parse(JSON.stringify(snapshot)) as JSONValue;
}

/**
 * Authoritative state reconstruction for the v2 journal.
 *
 * The genesis snapshot plus ordered replay of accepted intents define the live
 * state; the mutable `IGame` instance is only a seed for the anchor. Recovery
 * fails closed on any unverifiable journal, so a partial view can never be
 * mistaken for the committed head.
 */
export class ActionRecovery {
  private readonly store: IActionStore;
  private readonly engine: ActionEnginePort;

  public constructor(options: ActionRecoveryOptions) {
    this.store = options.store;
    this.engine = options.engine;
  }

  /**
   * Opens the stream anchor for a game, persisting the genesis snapshot the
   * first time. Idempotent: an existing stream is returned untouched.
   */
  public async ensureStream(game: IGame): Promise<StreamOpenResult> {
    const existing = await this.store.getStream(game.id);
    if (existing !== undefined) {
      await this.repairGenesis(existing, game);
      return {stream: existing, genesis: bindingOf(existing), opened: false};
    }

    const snapshot = game.serialize();
    const persisted = jsonSnapshot(snapshot);
    const genesis = bindGenesis(game.id, game.lastSaveId, snapshot);
    const opened = await this.store.openStream({
      gameId: game.id,
      genesisId: genesis.genesisId,
      baseSaveId: genesis.baseSaveId,
      stateHash: genesis.stateHash,
    });
    // The anchor is written before the snapshot on purpose: an orphan snapshot
    // without a stream would pin a future stream to a state nobody can prove.
    // A crash between the two writes is repaired by repairGenesis() while the
    // live game still matches the genesis hash.
    await this.store.putGenesisSnapshot({
      gameId: game.id,
      genesisId: genesis.genesisId,
      baseSaveId: genesis.baseSaveId,
      stateHash: genesis.stateHash,
      snapshot: persisted,
    });
    return {stream: opened.stream, genesis, opened: opened.status === 'opened'};
  }

  /** Replays the journal from genesis to its effective head. */
  public async recover(request: RecoveryRequest): Promise<RecoveredState> {
    if (request.checkpoint !== undefined) {
      throw new ActionRecoveryError(
        'CHECKPOINT_UNPROVEN',
        'checkpoint recovery is not supported: ' + CHECKPOINT_SUPPORT.reason,
      );
    }
    const stream = await this.store.getStream(request.gameId);
    if (stream === undefined) {
      throw new ActionRecoveryError('STREAM_MISSING', 'game ' + request.gameId + ' has no action journal');
    }
    const genesis = await this.requireGenesis(stream, request.liveGame);
    const intents = await this.readJournal(stream);
    const plan = planReplay(intents, stream.stateHash);
    if (plan.headRevision !== stream.revision) {
      throw new ActionRecoveryError(
        'JOURNAL_TRUNCATED',
        'stream head ' + stream.revision + ' has only ' + plan.headRevision + ' readable intents',
      );
    }
    const outcome = replayPlan(
      this.engine,
      genesis.snapshot as unknown as SerializedGame,
      stream.stateHash,
      plan,
      {captureRevision: request.captureRevision},
    );
    return {
      stream,
      revision: plan.headRevision,
      state: outcome.state,
      stateHash: outcome.stateHash,
      plan,
      verifiedPrompts: outcome.verifiedPrompts,
      capturedState: outcome.capturedState,
      capturedStateHash: outcome.capturedStateHash,
    };
  }

  private async readJournal(stream: ActionStream): Promise<Array<ActionIntent>> {
    const intents: Array<ActionIntent> = [];
    let fromRevision = 1;
    while (intents.length < stream.revision) {
      const page = await this.store.listIntents(stream.gameId, {
        fromRevision,
        limit: INTENT_PAGE_SIZE,
      });
      if (page.length === 0) {
        break;
      }
      intents.push(...page);
      const last = page[page.length - 1];
      if (last.revision < fromRevision) {
        break;
      }
      fromRevision = last.revision + 1;
    }
    return intents;
  }

  private async requireGenesis(
    stream: ActionStream,
    liveGame: IGame | undefined,
  ): Promise<GenesisSnapshotRecord> {
    const record = await this.repairGenesis(stream, liveGame);
    if (record.genesisId !== stream.genesisId ||
        record.stateHash !== stream.stateHash ||
        record.baseSaveId !== stream.baseSaveId) {
      throw new ActionRecoveryError(
        'GENESIS_MISMATCH',
        'the stored genesis record does not match the stream anchor',
      );
    }
    return record;
  }

  /**
   * Returns the stored genesis, or repairs a missing one from the live game.
   *
   * Repair is allowed only when the live snapshot still hashes exactly to the
   * anchor, which is the case only in the crash window between opening the
   * stream and writing the snapshot.
   */
  private async repairGenesis(
    stream: ActionStream,
    liveGame: IGame | undefined,
  ): Promise<GenesisSnapshotRecord> {
    const existing = await this.store.getGenesisSnapshot(stream.gameId);
    if (existing !== undefined) {
      return existing;
    }
    if (liveGame === undefined) {
      throw new ActionRecoveryError(
        'GENESIS_MISSING',
        'the genesis snapshot for game ' + stream.gameId + ' is not stored',
      );
    }
    const snapshot = liveGame.serialize();
    if (stateHashOf(snapshot) !== stream.stateHash) {
      throw new ActionRecoveryError(
        'GENESIS_MISSING',
        'the genesis snapshot is not stored and the live game no longer matches the genesis hash',
      );
    }
    const binding = bindGenesis(stream.gameId, stream.baseSaveId, snapshot);
    if (binding.genesisId !== stream.genesisId) {
      throw new ActionRecoveryError(
        'GENESIS_MISMATCH',
        'the live game binds to a different genesis than the stream',
      );
    }
    return this.store.putGenesisSnapshot({
      gameId: stream.gameId,
      genesisId: binding.genesisId,
      baseSaveId: binding.baseSaveId,
      stateHash: binding.stateHash,
      snapshot: jsonSnapshot(snapshot),
    });
  }
}
