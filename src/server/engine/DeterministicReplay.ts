import {Phase} from '../../common/Phase';
import {InputResponse} from '../../common/inputs/InputResponse';
import {PlayerId} from '../../common/Types';
import {canonicalHash, EnginePromptSnapshot, promptSnapshot} from './EngineCanonical';
import {EngineInputError} from './EngineErrors';
import {EngineHandle, EnginePromptState} from './EngineFacade';

export interface OrderedEngineInput {
  readonly actorId: PlayerId;
  readonly input: InputResponse;
}

export interface ReplayStep {
  readonly index: number;
  readonly actorId: PlayerId;
  readonly promptBefore: EnginePromptState;
  readonly phaseAfter: Phase;
  readonly generationAfter: number;
  readonly stateHashAfter: string;
}

export interface ReplayResult {
  readonly initialStateHash: string;
  readonly initialPrompts: ReadonlyArray<EnginePromptState>;
  readonly steps: ReadonlyArray<ReplayStep>;
  readonly finalStateHash: string;
  readonly finalPrompts: ReadonlyArray<EnginePromptState>;
  /** Hash of the ordered prompt sequence (all players, before each input and at the end). */
  readonly promptSequenceHash: string;
  readonly promptSequence: ReadonlyArray<EnginePromptState>;
  readonly inputCount: number;
}

/**
 * Deterministic replay harness.
 *
 * Inputs are applied in the supplied order. The harness records the canonical
 * state hash and the prompt sequence before/after every input, then returns a
 * single sequence hash so two runs can be compared cheaply.
 *
 * It intentionally does not recover deferred actions: callers should replay
 * ordered accepted inputs from a genesis/checkpoint state.
 */
export function replayOrderedInputs(handle: EngineHandle, inputs: ReadonlyArray<OrderedEngineInput>): ReplayResult {
  const initialStateHash = handle.stateHash();
  const initialPrompts = handle.prompts();
  const promptSequence: Array<EnginePromptState> = [...initialPrompts];
  const steps: Array<ReplayStep> = [];

  for (const [index, orderedInput] of inputs.entries()) {
    const promptBefore = promptForActor(handle, orderedInput.actorId);
    handle.applyInput(orderedInput.actorId, orderedInput.input);
    const step: ReplayStep = {
      index,
      actorId: orderedInput.actorId,
      promptBefore,
      phaseAfter: handle.game.phase,
      generationAfter: handle.game.generation,
      stateHashAfter: handle.stateHash(),
    };
    steps.push(step);
    promptSequence.push(...handle.prompts());
  }

  const finalStateHash = handle.stateHash();
  const finalPrompts = handle.prompts();
  return {
    initialStateHash,
    initialPrompts,
    steps,
    finalStateHash,
    finalPrompts,
    promptSequenceHash: canonicalHash(promptSequence),
    promptSequence,
    inputCount: inputs.length,
  };
}

function promptForActor(handle: EngineHandle, actorId: PlayerId): EnginePromptState {
  const prompt: EnginePromptSnapshot | null = handle.prompt(actorId);
  if (prompt === null) {
    throw new EngineInputError(`Cannot replay input for ${actorId}: player has no active prompt`);
  }
  return {actorId, ...prompt};
}

/** Returns a compact, comparable projection of a replay result. */
export function replayParityFingerprint(result: ReplayResult): unknown {
  return {
    initialStateHash: result.initialStateHash,
    promptSequenceHash: result.promptSequenceHash,
    steps: result.steps.map((step) => ({
      actorId: step.actorId,
      promptFingerprint: step.promptBefore.fingerprint,
      stateHashAfter: step.stateHashAfter,
      phase: step.phaseAfter,
      generation: step.generationAfter,
    })),
    finalStateHash: result.finalStateHash,
  };
}

export {promptSnapshot};
