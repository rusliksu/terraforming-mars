import {PlayerViewModel} from '../../src/common/models/PlayerModel';
import {GameId, PlayerId} from '../../src/common/Types';
import {ActionEnginePort, ActionEngineState} from '../../src/server/actionGateway/ActionEnginePort';
import {EnginePromptSnapshot} from '../../src/server/engine/EngineCanonical';
import {SerializedGame} from '../../src/server/SerializedGame';

type FakeStateData = {
  snapshot: SerializedGame;
  view: PlayerViewModel;
  prompt: EnginePromptSnapshot | null;
};

class FakeActionEngineState implements ActionEngineState {
  public constructor(
    public readonly gameId: GameId,
    private readonly data: FakeStateData,
  ) {}

  public serialize(): SerializedGame {
    return this.data.snapshot;
  }

  public view(_actorId: PlayerId): PlayerViewModel {
    return this.data.view;
  }

  public prompt(_actorId: PlayerId): EnginePromptSnapshot | null {
    return this.data.prompt;
  }

  public applyInput(): void {
    throw new Error('The gateway must use applyCandidate, not applyInput');
  }
}

export type FakeActionEngineOptions = {
  snapshot: SerializedGame;
  view: PlayerViewModel;
  initialPrompt: EnginePromptSnapshot | null;
  nextPrompt: EnginePromptSnapshot | null;
  failWith?: Error;
};

/**
 * Deterministic engine-port double. It counts candidate applies and never
 * mutates the input state, mirroring the real candidate port contract.
 */
export class FakeActionEngine implements ActionEnginePort {
  public applyCalls = 0;
  private readonly options: FakeActionEngineOptions;

  public constructor(options: FakeActionEngineOptions) {
    this.options = options;
  }

  public load(snapshot: SerializedGame): ActionEngineState {
    return new FakeActionEngineState(snapshot.id, {
      snapshot,
      view: this.options.view,
      prompt: this.options.initialPrompt,
    });
  }

  public applyCandidate(state: ActionEngineState): ActionEngineState {
    this.applyCalls++;
    if (this.options.failWith !== undefined) {
      throw this.options.failWith;
    }
    return new FakeActionEngineState(state.gameId, {
      snapshot: this.options.snapshot,
      view: this.options.view,
      prompt: this.options.nextPrompt,
    });
  }
}
