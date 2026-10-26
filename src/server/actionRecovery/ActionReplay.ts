import {PlayerId} from '../../common/Types';
import {ActionIntent, isSha256Hex} from '../actionStore';
import {ActionEnginePort, ActionEngineState} from '../actionGateway/ActionEnginePort';
import {stateHashOf} from '../actionGateway/StateBinding';
import {SerializedGame} from '../SerializedGame';
import {ActionRecoveryError} from './ActionRecoveryError';
import {V2ActionPayload, V2UndoPayload, parseV2IntentPayload} from './V2IntentPayload';

export type PlannedAction = {
  readonly intent: ActionIntent;
  readonly payload: V2ActionPayload;
};

export type PlannedUndo = {
  readonly intent: ActionIntent;
  readonly payload: V2UndoPayload;
};

/**
 * Effective history of a stream.
 *
 * `actions` is the ordered list replay must apply: append-only undo intents
 * never delete journal rows, they only truncate this list to the target.
 */
export type ReplayPlan = {
  readonly actions: ReadonlyArray<PlannedAction>;
  readonly undos: ReadonlyArray<PlannedUndo>;
  readonly headRevision: number;
  /** Hash the last journal entry claims for the effective head. */
  readonly expectedStateHash: string;
};

/**
 * Builds the effective plan and proves the journal chain is self-consistent.
 *
 * This pass is pure: it never loads the engine, so a corrupt chain is rejected
 * before any rules state is built.
 */
export function planReplay(
  intents: ReadonlyArray<ActionIntent>,
  genesisStateHash: string,
): ReplayPlan {
  if (!isSha256Hex(genesisStateHash)) {
    throw new ActionRecoveryError('GENESIS_MISMATCH', 'genesis state hash must be a lowercase SHA-256 hex string');
  }
  const actions: Array<PlannedAction> = [];
  const undos: Array<PlannedUndo> = [];
  let expectedStateHash = genesisStateHash;
  let headRevision = 0;

  for (const intent of intents) {
    if (intent.revision !== headRevision + 1) {
      throw new ActionRecoveryError(
        'JOURNAL_GAP',
        'expected revision ' + (headRevision + 1) + ', found ' + intent.revision,
      );
    }
    headRevision = intent.revision;
    const payload = parseV2IntentPayload(intent);

    if (payload.kind === 'action') {
      actions.push({intent, payload});
      expectedStateHash = payload.stateHashAfter;
      continue;
    }

    if (payload.targetRevision < 1) {
      throw new ActionRecoveryError('INTENT_CORRUPT', 'undo target revision must be at least 1');
    }
    const targetIndex = actions.findIndex((entry) => entry.intent.revision === payload.targetRevision);
    if (targetIndex < 0) {
      throw new ActionRecoveryError(
        'UNDO_TARGET_NOT_APPLIED',
        'undo at revision ' + intent.revision + ' targets an action that is not effective',
      );
    }
    const target = actions[targetIndex];
    // Undoing an action means replaying as if it never happened: the target and
    // everything accepted after it stop being effective.
    const restoredHash = targetIndex === 0 ?
      genesisStateHash :
      actions[targetIndex - 1].payload.stateHashAfter;
    if (restoredHash !== payload.stateHashAfter) {
      throw new ActionRecoveryError(
        'UNDO_TARGET_HASH_MISMATCH',
        'undo at revision ' + intent.revision + ' does not carry the target state hash',
      );
    }
    if (target.intent.actionId !== payload.undoneActionId) {
      throw new ActionRecoveryError(
        'INTENT_CORRUPT',
        'undo at revision ' + intent.revision + ' names a different action',
      );
    }
    if (target.intent.actorId !== intent.actorId) {
      throw new ActionRecoveryError(
        'INTENT_CORRUPT',
        'undo at revision ' + intent.revision + ' would revert another player',
      );
    }
    actions.splice(targetIndex);
    undos.push({intent, payload});
    expectedStateHash = payload.stateHashAfter;
  }

  return {actions, undos, headRevision, expectedStateHash};
}

export type ReplayOptions = {
  /** Effective revision whose state must also be captured. */
  readonly captureRevision?: number;
};

export type ReplayOutcome = {
  readonly state: ActionEngineState;
  readonly stateHash: string;
  /** Number of intents whose recorded prompt the engine reproduced. */
  readonly verifiedPrompts: number;
  readonly capturedState?: ActionEngineState;
  readonly capturedStateHash?: string;
};

/**
 * Deterministically replays the effective plan from the genesis snapshot.
 *
 * Every step is verified twice: the engine must present exactly the prompt the
 * intent answered, and the resulting canonical state hash must equal the hash
 * recorded at commit time. Any divergence aborts before a caller can use the
 * state, so a partially replayed game never becomes authoritative.
 */
export function replayPlan(
  engine: ActionEnginePort,
  genesisSnapshot: SerializedGame,
  genesisStateHash: string,
  plan: ReplayPlan,
  options: ReplayOptions = {},
): ReplayOutcome {
  let state: ActionEngineState;
  try {
    state = engine.load(genesisSnapshot);
  } catch (err) {
    throw new ActionRecoveryError(
      'GENESIS_NOT_REPRODUCIBLE',
      'the engine could not load the stored genesis snapshot',
      err,
    );
  }
  const baseHash = stateHashOf(state.serialize());
  if (baseHash !== genesisStateHash) {
    throw new ActionRecoveryError(
      'GENESIS_NOT_REPRODUCIBLE',
      'the stored genesis snapshot does not reproduce its recorded state hash',
    );
  }

  let capturedState: ActionEngineState | undefined = options.captureRevision === 0 ? state : undefined;
  let capturedStateHash: string | undefined = options.captureRevision === 0 ? baseHash : undefined;
  let verifiedPrompts = 0;

  for (const entry of plan.actions) {
    const actorId = entry.intent.actorId as PlayerId;
    const prompt = state.prompt(actorId);
    if (prompt === null) {
      throw new ActionRecoveryError(
        'PROMPT_MISMATCH',
        'actor ' + actorId + ' has no prompt at revision ' + entry.intent.revision,
      );
    }
    if (entry.intent.prompt !== null) {
      if (entry.intent.prompt.promptType !== prompt.type ||
          entry.intent.prompt.promptFingerprint !== prompt.fingerprint) {
        throw new ActionRecoveryError(
          'PROMPT_MISMATCH',
          'prompt drifted at revision ' + entry.intent.revision,
        );
      }
      verifiedPrompts++;
    }

    let next: ActionEngineState;
    try {
      next = engine.applyCandidate(state, actorId, entry.payload.input);
    } catch (err) {
      throw new ActionRecoveryError(
        'REPLAY_FAILED',
        'input at revision ' + entry.intent.revision + ' no longer replays',
        err,
      );
    }
    state = next;
    const stateHash = stateHashOf(state.serialize());
    if (stateHash !== entry.payload.stateHashAfter) {
      throw new ActionRecoveryError(
        'STATE_HASH_MISMATCH',
        'revision ' + entry.intent.revision + ' produced a different state hash',
      );
    }
    if (options.captureRevision === entry.intent.revision) {
      capturedState = state;
      capturedStateHash = stateHash;
    }
  }

  const stateHash = stateHashOf(state.serialize());
  if (stateHash !== plan.expectedStateHash) {
    throw new ActionRecoveryError('STATE_HASH_MISMATCH', 'recovered head does not match the journal head hash');
  }
  if (options.captureRevision !== undefined && capturedState === undefined) {
    throw new ActionRecoveryError(
      'UNDO_TARGET_NOT_APPLIED',
      'revision ' + options.captureRevision + ' is not on the effective history',
    );
  }

  return {state, stateHash, verifiedPrompts, capturedState, capturedStateHash};
}
