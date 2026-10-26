import type {ClientConfig, Pool, PoolClient} from 'pg';

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
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
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
  recorded_at_ms BIGINT NOT NULL,
  PRIMARY KEY (game_id, revision),
  UNIQUE (game_id, action_id),
  FOREIGN KEY (game_id) REFERENCES action_stream(game_id)
);
`;

type TimestampValue = string | number;

type StreamRow = {
  game_id: string;
  epoch: number;
  revision: number;
  last_event_hash: string;
  genesis_id: string;
  genesis_hash: string;
  base_save_id: number;
  state_hash: string;
  created_at_ms: TimestampValue;
  updated_at_ms: TimestampValue;
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
  recorded_at_ms: TimestampValue;
};

function rowToStream(row: StreamRow): ActionStream {
  return {
    gameId: row.game_id as GameId,
    epoch: Number(row.epoch),
    revision: Number(row.revision),
    lastEventHash: row.last_event_hash,
    genesisId: row.genesis_id,
    genesisHash: row.genesis_hash,
    baseSaveId: Number(row.base_save_id),
    stateHash: row.state_hash,
    createdAtMs: Number(row.created_at_ms),
    updatedAtMs: Number(row.updated_at_ms),
  };
}

function rowToIntent(row: IntentRow): ActionIntent {
  return {
    gameId: row.game_id as GameId,
    revision: Number(row.revision),
    actionId: row.action_id,
    epoch: Number(row.epoch),
    actorId: row.actor_id,
    intentType: row.intent_type,
    payload: JSON.parse(row.payload_json),
    payloadHash: row.payload_hash,
    prompt: row.prompt_json === null ? null : JSON.parse(row.prompt_json),
    genesisId: row.genesis_id,
    prevEventHash: row.prev_event_hash,
    eventHash: row.event_hash,
    recordedAtMs: Number(row.recorded_at_ms),
  };
}

export type PostgreSQLActionStoreOptions = {
  /** Clock seam for deterministic tests. */
  now?: () => number;
};

/**
 * PostgreSQL implementation of {@link IActionStore}.
 *
 * Every mutating operation holds one pooled client for the whole transaction
 * (`BEGIN` ... `COMMIT`/`ROLLBACK`). The stream row is locked with
 * `SELECT ... FOR UPDATE`, so concurrent writers serialize on the row and CAS
 * checks observe the committed head. Errors are never swallowed.
 */
export class PostgreSQLActionStore implements IActionStore {
  private _pool: Pool | undefined;
  private readonly now: () => number;

  constructor(private readonly config: ClientConfig, options: PostgreSQLActionStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
  }

  private get pool(): Pool {
    if (this._pool === undefined) {
      throw new Error('attempt to use action store before initialize');
    }
    return this._pool;
  }

  public async initialize(): Promise<void> {
    if (this._pool !== undefined) {
      return;
    }
    const pg = require('pg') as typeof import('pg');
    const pool = new pg.Pool(this.config);
    try {
      await pool.query(SCHEMA);
    } catch (err) {
      this._pool = undefined;
      try {
        await pool.end();
      } catch (endErr) {
        throw new AggregateError([err, endErr], 'action store schema creation and pool shutdown both failed');
      }
      throw err;
    }
    this._pool = pool;
  }

  public async close(): Promise<void> {
    const pool = this._pool;
    this._pool = undefined;
    if (pool !== undefined) {
      await pool.end();
    }
  }

  public async openStream(request: OpenActionStreamRequest): Promise<OpenActionStreamResult> {
    const validated = validateOpenActionStreamRequest(request);
    return await this.withTransaction((client) => this.openStreamInTransaction(client, validated));
  }

  private async openStreamInTransaction(
    client: PoolClient,
    validated: ValidatedOpenActionStreamRequest,
  ): Promise<OpenActionStreamResult> {
    const now = this.now();
    const inserted = await client.query<StreamRow>(
      `INSERT INTO action_stream(
        game_id, epoch, revision, last_event_hash, genesis_id, genesis_hash,
        base_save_id, state_hash, created_at_ms, updated_at_ms
      ) VALUES ($1, 1, 0, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (game_id) DO NOTHING
      RETURNING *`,
      [
        validated.gameId,
        validated.genesisHash,
        validated.genesisId,
        validated.genesisHash,
        validated.baseSaveId,
        validated.stateHash,
        now,
        now,
      ],
    );
    if (inserted.rowCount === 1) {
      return {status: 'opened', stream: rowToStream(inserted.rows[0])};
    }
    const existing = await client.query<StreamRow>(
      'SELECT * FROM action_stream WHERE game_id = $1',
      [validated.gameId],
    );
    if (existing.rowCount === 0) {
      throw new Error(`action stream for game ${validated.gameId} disappeared while opening`);
    }
    const stream = rowToStream(existing.rows[0]);
    if (stream.genesisHash !== validated.genesisHash) {
      throw new GenesisMismatchError(validated.gameId);
    }
    return {status: 'existing', stream};
  }

  public async fenceStream(request: FenceActionStreamRequest): Promise<ActionStream> {
    const validated = validateFenceActionStreamRequest(request);
    return await this.withTransaction((client) => this.fenceStreamInTransaction(client, validated));
  }

  private async fenceStreamInTransaction(
    client: PoolClient,
    validated: ValidatedFenceActionStreamRequest,
  ): Promise<ActionStream> {
    const row = await this.lockStreamRow(client, validated.gameId);
    if (row === undefined) {
      throw new StreamNotFoundError(validated.gameId);
    }
    const stream = rowToStream(row);
    if (stream.epoch !== validated.expectedEpoch) {
      throw new StaleEpochError(validated.gameId, validated.expectedEpoch, stream.epoch);
    }
    const updatedAtMs = this.now();
    const updated = await client.query(
      'UPDATE action_stream SET epoch = epoch + 1, updated_at_ms = $1 WHERE game_id = $2 AND epoch = $3',
      [updatedAtMs, validated.gameId, validated.expectedEpoch],
    );
    if (updated.rowCount !== 1) {
      throw new StaleEpochError(validated.gameId, validated.expectedEpoch, stream.epoch + 1);
    }
    return {...stream, epoch: stream.epoch + 1, updatedAtMs};
  }

  public async appendIntent(request: AppendActionIntentRequest): Promise<AppendActionIntentResult> {
    const validated = validateAppendActionIntentRequest(request);
    return await this.withTransaction((client) => this.appendIntentInTransaction(client, validated));
  }

  private async appendIntentInTransaction(
    client: PoolClient,
    validated: ValidatedAppendActionIntentRequest,
  ): Promise<AppendActionIntentResult> {
    const row = await this.lockStreamRow(client, validated.gameId);
    if (row === undefined) {
      throw new StreamNotFoundError(validated.gameId);
    }
    const stream = rowToStream(row);
    if (stream.genesisId !== validated.genesisId) {
      throw new GenesisMismatchError(validated.gameId);
    }

    // Idempotency is checked before CAS: a byte-identical retry of an accepted
    // action is safe even when its revision token is already stale.
    const existing = await client.query<IntentRow>(
      'SELECT * FROM action_intent WHERE game_id = $1 AND action_id = $2',
      [validated.gameId, validated.actionId],
    );
    if (existing.rowCount > 0) {
      const existingIntent = rowToIntent(existing.rows[0]);
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

    await client.query(
      `INSERT INTO action_intent(
        game_id, revision, action_id, epoch, actor_id, intent_type, payload_json,
        payload_hash, prompt_json, genesis_id, prev_event_hash, event_hash, recorded_at_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
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
      ],
    );

    const updated = await client.query(
      `UPDATE action_stream
        SET revision = $1, last_event_hash = $2, updated_at_ms = $3
        WHERE game_id = $4 AND revision = $5 AND epoch = $6`,
      [
        intent.revision,
        intent.eventHash,
        recordedAtMs,
        validated.gameId,
        validated.expectedRevision,
        validated.epoch,
      ],
    );
    if (updated.rowCount !== 1) {
      throw new RevisionConflictError(validated.gameId, validated.expectedRevision, stream.revision);
    }

    return {
      status: 'appended',
      intent,
      stream: {...stream, revision: intent.revision, lastEventHash: intent.eventHash, updatedAtMs: recordedAtMs},
    };
  }

  public async getStream(gameId: GameId): Promise<ActionStream | undefined> {
    const result = await this.pool.query<StreamRow>(
      'SELECT * FROM action_stream WHERE game_id = $1',
      [gameId],
    );
    return result.rowCount === 0 ? undefined : rowToStream(result.rows[0]);
  }

  public async getIntent(gameId: GameId, actionId: string): Promise<ActionIntent | undefined> {
    const result = await this.pool.query<IntentRow>(
      'SELECT * FROM action_intent WHERE game_id = $1 AND action_id = $2',
      [gameId, actionId],
    );
    return result.rowCount === 0 ? undefined : rowToIntent(result.rows[0]);
  }

  public async listIntents(
    gameId: GameId,
    options?: ListActionIntentsOptions,
  ): Promise<Array<ActionIntent>> {
    const {fromRevision, limit} = validateListActionIntentsOptions(options);
    const result = await this.pool.query<IntentRow>(
      `SELECT * FROM action_intent
        WHERE game_id = $1 AND revision >= $2
        ORDER BY revision ASC
        LIMIT $3`,
      [gameId, fromRevision, limit],
    );
    return result.rows.map(rowToIntent);
  }

  private async lockStreamRow(client: PoolClient, gameId: GameId): Promise<StreamRow | undefined> {
    const result = await client.query<StreamRow>(
      'SELECT * FROM action_stream WHERE game_id = $1 FOR UPDATE',
      [gameId],
    );
    return result.rowCount === 0 ? undefined : result.rows[0];
  }

  private async withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        throw new AggregateError([err, rollbackErr], 'action store transaction and rollback both failed');
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
