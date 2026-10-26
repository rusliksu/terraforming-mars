import fs from 'fs';
import path from 'path';

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
  ListActionIntentsOptions,
  OpenActionStreamRequest,
  OpenActionStreamResult,
} from './types';
import {
  buildActionIntent,
  isSameIntentContent,
  promiseFromSync,
} from './support';
import {
  validateAppendActionIntentRequest,
  validateFenceActionStreamRequest,
  validateListActionIntentsOptions,
  validateOpenActionStreamRequest,
  ValidatedAppendActionIntentRequest,
  ValidatedFenceActionStreamRequest,
  ValidatedOpenActionStreamRequest,
} from './validation';

export const IN_MEMORY_ACTION_STORE_PATH = ':memory:';

/**
 * Local structural types for the slice of better-sqlite3 this store uses.
 *
 * The repository ships a deliberately small better-sqlite3 declaration shim
 * (`src/types/better-sqlite3.d.ts`); widening it globally is out of scope for
 * this increment, so the store declares exactly what it needs.
 */
type SQLiteRunResult = {
  changes: number;
  lastInsertRowid: number | bigint;
};

type SQLiteStatement = {
  run(...params: unknown[]): SQLiteRunResult;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): Array<unknown>;
};

type SQLiteDatabase = {
  prepare(source: string): SQLiteStatement;
  exec(source: string): unknown;
  pragma(source: string): unknown;
  close(): unknown;
};

type SQLiteDatabaseConstructor = {
  new(filename: string): SQLiteDatabase;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS action_stream(
  game_id TEXT NOT NULL PRIMARY KEY,
  epoch INTEGER NOT NULL CHECK (epoch >= 1),
  revision INTEGER NOT NULL CHECK (revision >= 0),
  last_event_hash TEXT NOT NULL,
  genesis_id TEXT NOT NULL,
  genesis_hash TEXT NOT NULL,
  base_save_id INTEGER NOT NULL CHECK (base_save_id >= 0),
  state_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS action_intent(
  game_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  action_id TEXT NOT NULL,
  epoch INTEGER NOT NULL CHECK (epoch >= 1),
  actor_id TEXT NOT NULL,
  intent_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  prompt_json TEXT,
  genesis_id TEXT NOT NULL,
  prev_event_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  recorded_at_ms INTEGER NOT NULL,
  PRIMARY KEY (game_id, revision),
  UNIQUE (game_id, action_id),
  FOREIGN KEY (game_id) REFERENCES action_stream(game_id)
);
`;

type StreamRow = {
  game_id: string;
  epoch: number;
  revision: number;
  last_event_hash: string;
  genesis_id: string;
  genesis_hash: string;
  base_save_id: number;
  state_hash: string;
  created_at_ms: number;
  updated_at_ms: number;
};

type IntentRow = {
  game_id: string;
  revision: number;
  action_id: string;
  epoch: number;
  actor_id: string;
  intent_type: string;
  payload_json: string;
  payload_hash: string;
  prompt_json: string | null;
  genesis_id: string;
  prev_event_hash: string;
  event_hash: string;
  recorded_at_ms: number;
};

function rowToStream(row: StreamRow): ActionStream {
  return {
    gameId: row.game_id as GameId,
    epoch: row.epoch,
    revision: row.revision,
    lastEventHash: row.last_event_hash,
    genesisId: row.genesis_id,
    genesisHash: row.genesis_hash,
    baseSaveId: row.base_save_id,
    stateHash: row.state_hash,
    createdAtMs: row.created_at_ms,
    updatedAtMs: row.updated_at_ms,
  };
}

function rowToIntent(row: IntentRow): ActionIntent {
  return {
    gameId: row.game_id as GameId,
    revision: row.revision,
    actionId: row.action_id,
    epoch: row.epoch,
    actorId: row.actor_id,
    intentType: row.intent_type,
    payload: JSON.parse(row.payload_json),
    payloadHash: row.payload_hash,
    prompt: row.prompt_json === null ? null : JSON.parse(row.prompt_json),
    genesisId: row.genesis_id,
    prevEventHash: row.prev_event_hash,
    eventHash: row.event_hash,
    recordedAtMs: row.recorded_at_ms,
  };
}

export type SQLiteActionStoreOptions = {
  /** Clock seam for deterministic tests. */
  now?: () => number;
};

/**
 * SQLite implementation of {@link IActionStore}.
 *
 * Each mutating operation runs inside a single `BEGIN IMMEDIATE` transaction on
 * the store's one connection. Any throw (including an injected constraint or
 * trigger failure) rolls the whole transaction back and is rethrown.
 */
export class SQLiteActionStore implements IActionStore {
  private _db: SQLiteDatabase | undefined;
  private readonly now: () => number;

  constructor(private readonly filename: string, options: SQLiteActionStoreOptions = {}) {
    if (filename.length === 0) {
      throw new Error('SQLiteActionStore requires a filename');
    }
    this.now = options.now ?? (() => Date.now());
  }

  protected get db(): SQLiteDatabase {
    if (this._db === undefined) {
      throw new Error('attempt to use action store before initialize');
    }
    return this._db;
  }

  public initialize(): Promise<void> {
    return promiseFromSync(() => {
      if (this._db !== undefined) {
        return;
      }
      if (this.filename !== IN_MEMORY_ACTION_STORE_PATH) {
        fs.mkdirSync(path.dirname(this.filename), {recursive: true});
      }
      const Database = require('better-sqlite3') as SQLiteDatabaseConstructor;
      const db = new Database(this.filename);
      db.pragma('foreign_keys = ON');
      db.pragma('busy_timeout = 5000');
      db.exec(SCHEMA);
      this._db = db;
    });
  }

  public close(): Promise<void> {
    return promiseFromSync(() => {
      const db = this._db;
      this._db = undefined;
      db?.close();
    });
  }

  public openStream(request: OpenActionStreamRequest): Promise<OpenActionStreamResult> {
    return promiseFromSync(() => {
      const validated = validateOpenActionStreamRequest(request);
      return this.runInTransaction(() => this.openStreamInTransaction(validated));
    });
  }

  private openStreamInTransaction(validated: ValidatedOpenActionStreamRequest): OpenActionStreamResult {
    const existing = this.readStreamRow(validated.gameId);
    if (existing !== undefined) {
      if (existing.genesis_hash !== validated.genesisHash) {
        throw new GenesisMismatchError(validated.gameId);
      }
      return {status: 'existing', stream: rowToStream(existing)};
    }
    const now = this.now();
    this.db.prepare(
      `INSERT INTO action_stream(
        game_id, epoch, revision, last_event_hash, genesis_id, genesis_hash,
        base_save_id, state_hash, created_at_ms, updated_at_ms
      ) VALUES (?, 1, 0, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      validated.gameId,
      validated.genesisHash,
      validated.genesisId,
      validated.genesisHash,
      validated.baseSaveId,
      validated.stateHash,
      now,
      now,
    );
    return {
      status: 'opened',
      stream: {
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
      },
    };
  }

  public fenceStream(request: FenceActionStreamRequest): Promise<ActionStream> {
    return promiseFromSync(() => {
      const validated = validateFenceActionStreamRequest(request);
      return this.runInTransaction(() => this.fenceStreamInTransaction(validated));
    });
  }

  private fenceStreamInTransaction(validated: ValidatedFenceActionStreamRequest): ActionStream {
    const row = this.readStreamRow(validated.gameId);
    if (row === undefined) {
      throw new StreamNotFoundError(validated.gameId);
    }
    const stream = rowToStream(row);
    if (stream.epoch !== validated.expectedEpoch) {
      throw new StaleEpochError(validated.gameId, validated.expectedEpoch, stream.epoch);
    }
    const updatedAtMs = this.now();
    const result = this.db.prepare(
      'UPDATE action_stream SET epoch = epoch + 1, updated_at_ms = ? WHERE game_id = ? AND epoch = ?',
    ).run(updatedAtMs, validated.gameId, validated.expectedEpoch);
    if (result.changes !== 1) {
      throw new StaleEpochError(validated.gameId, validated.expectedEpoch, stream.epoch + 1);
    }
    return {...stream, epoch: stream.epoch + 1, updatedAtMs};
  }

  public appendIntent(request: AppendActionIntentRequest): Promise<AppendActionIntentResult> {
    return promiseFromSync(() => {
      const validated = validateAppendActionIntentRequest(request);
      return this.runInTransaction(() => this.appendIntentInTransaction(validated));
    });
  }

  private appendIntentInTransaction(
    validated: ValidatedAppendActionIntentRequest,
  ): AppendActionIntentResult {
    const row = this.readStreamRow(validated.gameId);
    if (row === undefined) {
      throw new StreamNotFoundError(validated.gameId);
    }
    const stream = rowToStream(row);
    if (stream.genesisId !== validated.genesisId) {
      throw new GenesisMismatchError(validated.gameId);
    }

    // Idempotency is checked before CAS: a byte-identical retry of an accepted
    // action is safe even when its revision token is already stale.
    const existing = this.readIntentRow(validated.gameId, validated.actionId);
    if (existing !== undefined) {
      const existingIntent = rowToIntent(existing);
      if (!isSameIntentContent(existingIntent, validated)) {
        throw new ActionIdConflictError(
          validated.gameId,
          validated.actionId,
          existingIntent.payloadHash,
          validated.payloadHash,
        );
      }
      return {status: 'duplicate', intent: existingIntent, stream};
    }

    if (stream.epoch !== validated.epoch) {
      throw new StaleEpochError(validated.gameId, validated.epoch, stream.epoch);
    }
    if (stream.revision !== validated.expectedRevision) {
      throw new RevisionConflictError(validated.gameId, validated.expectedRevision, stream.revision);
    }

    const revision = validated.expectedRevision + 1;
    const recordedAtMs = this.now();
    const intent = buildActionIntent({
      revision,
      prevEventHash: stream.lastEventHash,
      recordedAtMs,
      request: validated,
    });

    this.db.prepare(
      `INSERT INTO action_intent(
        game_id, revision, action_id, epoch, actor_id, intent_type, payload_json,
        payload_hash, prompt_json, genesis_id, prev_event_hash, event_hash, recorded_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      intent.gameId,
      intent.revision,
      intent.actionId,
      intent.epoch,
      intent.actorId,
      intent.intentType,
      validated.payloadJson,
      intent.payloadHash,
      validated.promptJson,
      intent.genesisId,
      intent.prevEventHash,
      intent.eventHash,
      intent.recordedAtMs,
    );

    const updated = this.db.prepare(
      `UPDATE action_stream
        SET revision = ?, last_event_hash = ?, updated_at_ms = ?
        WHERE game_id = ? AND revision = ? AND epoch = ?`,
    ).run(
      intent.revision,
      intent.eventHash,
      recordedAtMs,
      validated.gameId,
      validated.expectedRevision,
      validated.epoch,
    );
    if (updated.changes !== 1) {
      throw new RevisionConflictError(validated.gameId, validated.expectedRevision, stream.revision);
    }

    return {
      status: 'appended',
      intent,
      stream: {...stream, revision: intent.revision, lastEventHash: intent.eventHash, updatedAtMs: recordedAtMs},
    };
  }

  public getStream(gameId: GameId): Promise<ActionStream | undefined> {
    return promiseFromSync(() => {
      const row = this.readStreamRow(gameId);
      return row === undefined ? undefined : rowToStream(row);
    });
  }

  public getIntent(gameId: GameId, actionId: string): Promise<ActionIntent | undefined> {
    return promiseFromSync(() => {
      const row = this.readIntentRow(gameId, actionId);
      return row === undefined ? undefined : rowToIntent(row);
    });
  }

  public listIntents(gameId: GameId, options?: ListActionIntentsOptions): Promise<Array<ActionIntent>> {
    return promiseFromSync(() => {
      const {fromRevision, limit} = validateListActionIntentsOptions(options);
      const rows = this.db.prepare(
        `SELECT * FROM action_intent
          WHERE game_id = ? AND revision >= ?
          ORDER BY revision ASC
          LIMIT ?`,
      ).all(gameId, fromRevision, limit) as Array<IntentRow>;
      return rows.map(rowToIntent);
    });
  }

  private readStreamRow(gameId: GameId): StreamRow | undefined {
    return this.db.prepare(
      'SELECT * FROM action_stream WHERE game_id = ?',
    ).get(gameId) as StreamRow | undefined;
  }

  private readIntentRow(gameId: GameId, actionId: string): IntentRow | undefined {
    return this.db.prepare(
      'SELECT * FROM action_intent WHERE game_id = ? AND action_id = ?',
    ).get(gameId, actionId) as IntentRow | undefined;
  }

  /**
   * Runs a mutating operation on the store's single connection. The immediate
   * transaction takes the write lock before the stream head is read, so CAS
   * checks cannot interleave with another writer on this database file.
   */
  private runInTransaction<T>(operation: () => T): T {
    const db = this.db;
    db.prepare('BEGIN IMMEDIATE').run();
    try {
      const result = operation();
      db.prepare('COMMIT').run();
      return result;
    } catch (err) {
      try {
        db.prepare('ROLLBACK').run();
      } catch (rollbackErr) {
        throw new AggregateError([err, rollbackErr], 'action journal transaction and rollback both failed');
      }
      throw err;
    }
  }
}
