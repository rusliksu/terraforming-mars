/**
 * Fail-closed recovery error.
 *
 * Recovery never repairs a journal it cannot verify: every failure is a
 * distinct code so operators can tell a truncated journal from a rules-engine
 * divergence without reading private state.
 */
export type ActionRecoveryErrorCode =
  | 'STREAM_MISSING'
  | 'GENESIS_MISSING'
  | 'GENESIS_MISMATCH'
  | 'GENESIS_NOT_REPRODUCIBLE'
  | 'JOURNAL_GAP'
  | 'JOURNAL_TRUNCATED'
  | 'INTENT_CORRUPT'
  | 'PROMPT_MISMATCH'
  | 'STATE_HASH_MISMATCH'
  | 'REPLAY_FAILED'
  | 'UNDO_TARGET_NOT_APPLIED'
  | 'UNDO_TARGET_HASH_MISMATCH'
  | 'CHECKPOINT_UNPROVEN';

export class ActionRecoveryError extends Error {
  public constructor(
    public readonly code: ActionRecoveryErrorCode,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ActionRecoveryError';
  }
}

/**
 * Checkpoints are deliberately not promised yet.
 *
 * A checkpoint is only safe when the snapshot provably carries every deferred
 * action and the exact waiting-for continuation. `Game.serialize` does not
 * persist deferred actions, so that proof cannot be produced; recovery always
 * replays the journal from genesis instead of silently dropping continuations.
 */
export const CHECKPOINT_SUPPORT = Object.freeze({
  supported: false,
  reason: 'deferred action continuations are not part of the serialized state, so an exact continuation proof cannot be produced',
});
