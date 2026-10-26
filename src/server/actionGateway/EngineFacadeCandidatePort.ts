import {InputResponse} from '../../common/inputs/InputResponse';
import {PlayerViewModel} from '../../common/models/PlayerModel';
import {GameId, PlayerId} from '../../common/Types';
import {Server} from '../models/ServerModel';
import {EngineFacade, EngineHandle} from '../engine/EngineFacade';
import {EnginePromptSnapshot, promptSnapshot} from '../engine/EngineCanonical';
import {createDeterministicEngineDependencies} from '../engine/EngineDependencies';
import {SerializedGame} from '../SerializedGame';
import {ActionEnginePort, ActionEngineState} from './ActionEnginePort';

export type EngineFacadeCandidatePortOptions = {
  /** Clock seam for deterministic tests; defaults to wall clock time. */
  now?: () => number;
  /** Prefix for IDs allocated while applying a candidate. */
  idPrefix?: string;
};

class EngineFacadeCandidateState implements ActionEngineState {
  public constructor(private readonly handle: EngineHandle) {}

  public get gameId(): GameId {
    return this.handle.game.id;
  }

  public serialize(): SerializedGame {
    return this.handle.serialize();
  }

  public view(actorId: PlayerId): PlayerViewModel {
    return Server.getPlayerModel(this.handle.game.getPlayerById(actorId));
  }

  public prompt(actorId: PlayerId): EnginePromptSnapshot | null {
    return promptSnapshot(this.handle.game.getPlayerById(actorId));
  }

  public applyInput(actorId: PlayerId, input: InputResponse): void {
    this.handle.applyInput(actorId, input);
  }
}

/**
 * Candidate-only engine port built on the host-neutral EngineFacade.
 *
 * It supports the base + Prelude slice. Loading and applying happen on a
 * deserialized snapshot; the live game instance is never touched. Because
 * checkpoint persistence and mid-deferred recovery belong to A5b, this port is
 * only wired behind the explicit candidate feature flag.
 */
export class EngineFacadeCandidatePort implements ActionEnginePort {
  private readonly now: () => number;
  private readonly idPrefix: string;

  public constructor(options: EngineFacadeCandidatePortOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.idPrefix = options.idPrefix ?? 'candidate';
  }

  public load(snapshot: SerializedGame): ActionEngineState {
    const dependencies = createDeterministicEngineDependencies({
      nowMs: this.now(),
      idPrefix: this.idPrefix,
    });
    const facade = new EngineFacade(dependencies);
    // A serialized game contains shared nested objects. Clone before load so
    // mutations of the caller's snapshot (or the live game) cannot leak into
    // the isolated candidate.
    const isolated = JSON.parse(JSON.stringify(snapshot)) as SerializedGame;
    return new EngineFacadeCandidateState(facade.load(isolated));
  }

  public applyCandidate(
    state: ActionEngineState,
    actorId: PlayerId,
    input: InputResponse,
  ): ActionEngineState {
    const candidate = this.load(state.serialize());
    candidate.applyInput(actorId, input);
    return candidate;
  }
}
