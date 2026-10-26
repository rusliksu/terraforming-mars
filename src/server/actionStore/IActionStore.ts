import {GameId} from '../../common/Types';
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

/**
 * Durable append-only journal of accepted game intents.
 *
 * Implementations must:
 * - keep every write atomic on a single connection/transaction;
 * - enforce uniqueness of (gameId, actionId) and (gameId, revision);
 * - enforce revision CAS and epoch fencing;
 * - never swallow a persistence error.
 *
 * This contract is deliberately disconnected from routes and PlayerInput: the
 * gateway that will call it lands in a later increment.
 */
export interface IActionStore {
  /** Creates the backing tables/schema. Idempotent. */
  initialize(): Promise<void>;

  /** Releases the underlying connection/pool. Idempotent. */
  close(): Promise<void>;

  /**
   * Opens a stream anchored at a genesis reference, or returns the existing
   * stream when the genesis matches.
   *
   * Rejects with {@link GenesisMismatchError} when the game already has a
   * stream anchored to a different genesis.
   */
  openStream(request: OpenActionStreamRequest): Promise<OpenActionStreamResult>;

  /**
   * Advances the stream epoch, fencing out writers that still hold the old
   * epoch. Rejects with {@link StaleEpochError} when `expectedEpoch` is stale.
   */
  fenceStream(request: FenceActionStreamRequest): Promise<ActionStream>;

  /**
   * Appends one intent using revision CAS and epoch fencing.
   *
   * An exact retry of an accepted `actionId` returns `status: 'duplicate'`
   * with the original intent. Reusing `actionId` with different content
   * rejects with {@link ActionIdConflictError}.
   */
  appendIntent(request: AppendActionIntentRequest): Promise<AppendActionIntentResult>;

  /** Returns stream metadata, or `undefined` for an unknown game. */
  getStream(gameId: GameId): Promise<ActionStream | undefined>;

  /** Returns one intent by idempotency key, or `undefined`. */
  getIntent(gameId: GameId, actionId: string): Promise<ActionIntent | undefined>;

  /**
   * Returns intents in revision order. An unknown game returns an empty list.
   */
  listIntents(gameId: GameId, options?: ListActionIntentsOptions): Promise<Array<ActionIntent>>;
}
