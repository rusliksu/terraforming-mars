import type {InputResponse} from '../../common/inputs/InputResponse';
import type {PlayerViewModel} from '../../common/models/PlayerModel';
import type {GameId, PlayerId} from '../../common/Types';
import type {EnginePromptSnapshot} from '../engine/EngineCanonical';
import type {SerializedGame} from '../SerializedGame';

/**
 * An isolated engine state built from a serialized snapshot.
 *
 * The gateway never mutates the live game: it loads a snapshot, asks the port
 * for a candidate state, and commits only the append-only journal entry. Live
 * checkpoint/commit belongs to the A5b recovery increment.
 */
export interface ActionEngineState {
  readonly gameId: GameId;
  serialize(): SerializedGame;
  /** Authorized view for one actor; never a SerializedGame. */
  view(actorId: PlayerId): PlayerViewModel;
  /** Current prompt of the actor, or null when the actor is not waiting. */
  prompt(actorId: PlayerId): EnginePromptSnapshot | null;
  /** Applies one input to this isolated state. Throws InputError/EngineInputError when illegal. */
  applyInput(actorId: PlayerId, input: InputResponse): void;
}

/**
 * Explicit engine port for the v2 gateway.
 *
 * Implementations must be side-effect free for the live game: `applyCandidate`
 * returns a new state and leaves the input state untouched. A future live
 * adapter (A5b) can implement checkpointing behind the same seam.
 */
export interface ActionEnginePort {
  /** Loads a snapshot into an isolated engine state. */
  load(snapshot: SerializedGame): ActionEngineState;

  /**
   * Returns a new candidate state with the input applied.
   *
   * The input state is not mutated. Illegal input must throw an InputError or
   * an EngineInputError so the gateway can answer INVALID_ACTION without a
   * journal write.
   */
  applyCandidate(state: ActionEngineState, actorId: PlayerId, input: InputResponse): ActionEngineState;
}
