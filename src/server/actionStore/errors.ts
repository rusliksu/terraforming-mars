export type ActionStoreErrorCode =
  | 'ACTION_ID_CONFLICT'
  | 'GENESIS_MISMATCH'
  | 'INVALID_GENESIS'
  | 'INVALID_INTENT'
  | 'INVALID_QUERY'
  | 'REVISION_CONFLICT'
  | 'STALE_EPOCH'
  | 'STREAM_NOT_FOUND';

/**
 * Base class for every rejected action journal operation.
 *
 * Adapters never swallow these errors: a rejected write is rolled back and the
 * error is rethrown to the caller.
 */
export class ActionStoreError extends Error {
  public readonly code: ActionStoreErrorCode;

  constructor(code: ActionStoreErrorCode, message: string) {
    super(message);
    this.name = 'ActionStoreError';
    this.code = code;
  }
}

export class InvalidActionGenesisError extends ActionStoreError {
  constructor(message: string) {
    super('INVALID_GENESIS', message);
    this.name = 'InvalidActionGenesisError';
  }
}

export class InvalidActionIntentError extends ActionStoreError {
  constructor(message: string) {
    super('INVALID_INTENT', message);
    this.name = 'InvalidActionIntentError';
  }
}

export class InvalidActionQueryError extends ActionStoreError {
  constructor(message: string) {
    super('INVALID_QUERY', message);
    this.name = 'InvalidActionQueryError';
  }
}

/**
 * The same `actionId` was already recorded with different intent content
 * (payload, actor, intent type, or prompt metadata).
 */
export class ActionIdConflictError extends ActionStoreError {
  constructor(
    public readonly gameId: string,
    public readonly actionId: string,
    public readonly existingPayloadHash: string,
    public readonly incomingPayloadHash: string,
  ) {
    super(
      'ACTION_ID_CONFLICT',
      `Action id ${actionId} for game ${gameId} is already recorded with different intent content`,
    );
    this.name = 'ActionIdConflictError';
  }
}

/**
 * The writer's `expectedRevision` does not match the stream head.
 */
export class RevisionConflictError extends ActionStoreError {
  constructor(
    public readonly gameId: string,
    public readonly expectedRevision: number,
    public readonly actualRevision: number,
  ) {
    super(
      'REVISION_CONFLICT',
      `Game ${gameId} is at revision ${actualRevision}, writer expected ${expectedRevision}`,
    );
    this.name = 'RevisionConflictError';
  }
}

/**
 * The writer holds a fencing epoch older than the current stream epoch.
 */
export class StaleEpochError extends ActionStoreError {
  constructor(
    public readonly gameId: string,
    public readonly expectedEpoch: number,
    public readonly actualEpoch: number,
  ) {
    super(
      'STALE_EPOCH',
      `Game ${gameId} is at epoch ${actualEpoch}, writer holds epoch ${expectedEpoch}`,
    );
    this.name = 'StaleEpochError';
  }
}

export class StreamNotFoundError extends ActionStoreError {
  constructor(public readonly gameId: string) {
    super('STREAM_NOT_FOUND', `No action stream for game ${gameId}`);
    this.name = 'StreamNotFoundError';
  }
}

/**
 * The stream was opened from a different genesis than the one presented.
 */
export class GenesisMismatchError extends ActionStoreError {
  constructor(public readonly gameId: string) {
    super('GENESIS_MISMATCH', `Action stream for game ${gameId} is anchored to a different genesis`);
    this.name = 'GenesisMismatchError';
  }
}
