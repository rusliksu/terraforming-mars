import {GameId} from '../../common/Types';
import {IActionStore} from './IActionStore';
import {
  ActionIdConflictError,
  GenesisMismatchError,
  RevisionConflictError,
  StaleEpochError,
  StreamNotFoundError,
} from './errors';
import {
  ActionIntent,
  ActionStream,
  AppendActionIntentRequest,
  AppendActionIntentResult,
  FenceActionStreamRequest,
  GenesisSnapshotRecord,
  ListActionIntentsOptions,
  OpenActionStreamRequest,
  OpenActionStreamResult,
  PutGenesisSnapshotRequest,
} from './types';
import {
  buildActionIntent,
  cloneActionIntent,
  cloneActionStream,
  cloneGenesisSnapshot,
  isSameIntentContent,
  promiseFromSync,
} from './support';
import {
  validateAppendActionIntentRequest,
  validateFenceActionStreamRequest,
  validateListActionIntentsOptions,
  validateOpenActionStreamRequest,
  validatePutGenesisSnapshotRequest,
} from './validation';
import {canonicalJson} from './canonical';

export type InMemoryActionStoreOptions = {
  /** Clock seam for deterministic tests. */
  now?: () => number;
  /**
   * Test-only hook invoked after an intent is staged but before the stream head
   * advances. Throwing from it must leave the journal unchanged.
   */
  afterIntentInsert?: (gameId: GameId) => void;
};

type GameJournal = {
  stream: ActionStream;
  intentsByRevision: Map<number, ActionIntent>;
  intentsByActionId: Map<string, ActionIntent>;
};

/**
 * In-memory implementation of {@link IActionStore} for tests and local
 * development. It follows the same validation, CAS, fencing, and idempotency
 * rules as the durable adapters, but stores everything in Maps.
 */
export class InMemoryActionStore implements IActionStore {
  private readonly journals = new Map<GameId, GameJournal>();
  private readonly genesisRecords = new Map<GameId, GenesisSnapshotRecord>();
  private readonly now: () => number;
  private initialized = false;

  constructor(private readonly options: InMemoryActionStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
  }

  public initialize(): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }

  public close(): Promise<void> {
    this.journals.clear();
    this.genesisRecords.clear();
    this.initialized = false;
    return Promise.resolve();
  }

  public openStream(request: OpenActionStreamRequest): Promise<OpenActionStreamResult> {
    return promiseFromSync(() => {
      this.requireInitialized();
      const validated = validateOpenActionStreamRequest(request);
      const existing = this.journals.get(validated.gameId);
      if (existing !== undefined) {
        if (existing.stream.genesisHash !== validated.genesisHash) {
          throw new GenesisMismatchError(validated.gameId);
        }
        return {status: 'existing', stream: cloneActionStream(existing.stream)};
      }
      const now = this.now();
      const stream: ActionStream = {
        gameId: validated.gameId,
        epoch: 1,
        revision: 0,
        lastEventHash: validated.genesisHash,
        genesisId: validated.genesisId,
        genesisHash: validated.genesisHash,
        baseSaveId: validated.baseSaveId,
        stateHash: validated.stateHash,
        createdAtMs: now,
        updatedAtMs: now,
      };
      this.journals.set(validated.gameId, {
        stream,
        intentsByRevision: new Map(),
        intentsByActionId: new Map(),
      });
      return {status: 'opened', stream: cloneActionStream(stream)};
    });
  }

  public fenceStream(request: FenceActionStreamRequest): Promise<ActionStream> {
    return promiseFromSync(() => {
      this.requireInitialized();
      const validated = validateFenceActionStreamRequest(request);
      const journal = this.requireJournal(validated.gameId);
      if (journal.stream.epoch !== validated.expectedEpoch) {
        throw new StaleEpochError(validated.gameId, validated.expectedEpoch, journal.stream.epoch);
      }
      journal.stream = {
        ...journal.stream,
        epoch: journal.stream.epoch + 1,
        updatedAtMs: this.now(),
      };
      return cloneActionStream(journal.stream);
    });
  }

  public appendIntent(request: AppendActionIntentRequest): Promise<AppendActionIntentResult> {
    return promiseFromSync(() => {
      this.requireInitialized();
      return this.appendIntentSync(validateAppendActionIntentRequest(request));
    });
  }

  private appendIntentSync(
    validated: ReturnType<typeof validateAppendActionIntentRequest>,
  ): AppendActionIntentResult {
    const journal = this.requireJournal(validated.gameId);
    if (journal.stream.genesisId !== validated.genesisId) {
      throw new GenesisMismatchError(validated.gameId);
    }

    // Idempotency is checked before CAS: a byte-identical retry of an accepted
    // action is safe even when its revision token is already stale.
    const existing = journal.intentsByActionId.get(validated.actionId);
    if (existing !== undefined) {
      if (!isSameIntentContent(existing, validated)) {
        throw new ActionIdConflictError(
          validated.gameId,
          validated.actionId,
          existing.payloadHash,
          validated.payloadHash,
        );
      }
      return {
        status: 'duplicate',
        intent: cloneActionIntent(existing),
        stream: cloneActionStream(journal.stream),
      };
    }

    if (journal.stream.epoch !== validated.epoch) {
      throw new StaleEpochError(validated.gameId, validated.epoch, journal.stream.epoch);
    }
    if (journal.stream.revision !== validated.expectedRevision) {
      throw new RevisionConflictError(validated.gameId, validated.expectedRevision, journal.stream.revision);
    }

    const revision = validated.expectedRevision + 1;
    const recordedAtMs = this.now();
    const intent = buildActionIntent({
      revision,
      prevEventHash: journal.stream.lastEventHash,
      recordedAtMs,
      request: validated,
    });

    journal.intentsByRevision.set(revision, intent);
    journal.intentsByActionId.set(validated.actionId, intent);
    try {
      this.options.afterIntentInsert?.(validated.gameId);
      journal.stream = {
        ...journal.stream,
        revision,
        lastEventHash: intent.eventHash,
        updatedAtMs: recordedAtMs,
      };
      return {
        status: 'appended',
        intent: cloneActionIntent(intent),
        stream: cloneActionStream(journal.stream),
      };
    } catch (err) {
      // A failed write must not leave a partial record behind.
      journal.intentsByRevision.delete(revision);
      journal.intentsByActionId.delete(validated.actionId);
      throw err;
    }
  }

  public getStream(gameId: GameId): Promise<ActionStream | undefined> {
    return promiseFromSync(() => {
      this.requireInitialized();
      const journal = this.journals.get(gameId);
      return journal === undefined ? undefined : cloneActionStream(journal.stream);
    });
  }

  public getIntent(gameId: GameId, actionId: string): Promise<ActionIntent | undefined> {
    return promiseFromSync(() => {
      this.requireInitialized();
      const journal = this.journals.get(gameId);
      const intent = journal?.intentsByActionId.get(actionId);
      return intent === undefined ? undefined : cloneActionIntent(intent);
    });
  }

  public listIntents(gameId: GameId, options?: ListActionIntentsOptions): Promise<Array<ActionIntent>> {
    return promiseFromSync(() => {
      this.requireInitialized();
      const {fromRevision, limit} = validateListActionIntentsOptions(options);
      const journal = this.journals.get(gameId);
      if (journal === undefined) {
        return [];
      }
      const result: Array<ActionIntent> = [];
      for (let revision = fromRevision; revision <= journal.stream.revision && result.length < limit; revision++) {
        const intent = journal.intentsByRevision.get(revision);
        if (intent !== undefined) {
          result.push(cloneActionIntent(intent));
        }
      }
      return result;
    });
  }

  public putGenesisSnapshot(request: PutGenesisSnapshotRequest): Promise<GenesisSnapshotRecord> {
    return promiseFromSync(() => {
      this.requireInitialized();
      const validated = validatePutGenesisSnapshotRequest(request);
      const journal = this.journals.get(validated.gameId);
      if (journal !== undefined && journal.stream.genesisId !== validated.genesisId) {
        throw new GenesisMismatchError(validated.gameId);
      }
      const existing = this.genesisRecords.get(validated.gameId);
      if (existing !== undefined) {
        if (existing.genesisId !== validated.genesisId ||
            existing.stateHash !== validated.stateHash ||
            canonicalJson(existing.snapshot) !== validated.snapshotJson) {
          throw new GenesisMismatchError(validated.gameId);
        }
        return cloneGenesisSnapshot(existing);
      }
      const record: GenesisSnapshotRecord = {
        gameId: validated.gameId,
        genesisId: validated.genesisId,
        baseSaveId: validated.baseSaveId,
        stateHash: validated.stateHash,
        snapshot: JSON.parse(validated.snapshotJson),
        createdAtMs: this.now(),
      };
      this.genesisRecords.set(validated.gameId, record);
      return cloneGenesisSnapshot(record);
    });
  }

  public getGenesisSnapshot(gameId: GameId): Promise<GenesisSnapshotRecord | undefined> {
    return promiseFromSync(() => {
      this.requireInitialized();
      const record = this.genesisRecords.get(gameId);
      return record === undefined ? undefined : cloneGenesisSnapshot(record);
    });
  }

  private requireInitialized(): void {
    if (!this.initialized) {
      throw new Error('attempt to use action store before initialize');
    }
  }

  private requireJournal(gameId: GameId): GameJournal {
    const journal = this.journals.get(gameId);
    if (journal === undefined) {
      throw new StreamNotFoundError(gameId);
    }
    return journal;
  }
}
