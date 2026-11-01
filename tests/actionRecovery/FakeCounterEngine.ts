import type {InputResponse} from '../../src/common/inputs/InputResponse';
import type {PlayerViewModel} from '../../src/common/models/PlayerModel';
import type {GameId, PlayerId} from '../../src/common/Types';
import type {ActionEnginePort, ActionEngineState} from '../../src/server/actionGateway/ActionEnginePort';
import type {EnginePromptSnapshot} from '../../src/server/engine/EngineCanonical';
import type {SerializedGame} from '../../src/server/SerializedGame';

type CounterSnapshot = {
  id: string;
  counter?: number;
  lastActor?: string;
};

/**
 * Minimal deterministic engine double for append-only undo tests.
 *
 * Every applied input increments `counter`, so each revision has a distinct
 * canonical state hash that replay must reproduce. `revealsHiddenInformation`
 * is switchable so both the safe and the refusing undo paths are testable.
 */
class CounterState implements ActionEngineState {
  public constructor(
    private readonly snapshot: CounterSnapshot,
    private readonly promptValue: EnginePromptSnapshot | null,
    private readonly viewTemplate: PlayerViewModel,
  ) {}

  public get gameId(): GameId {
    return this.snapshot.id as GameId;
  }

  public serialize(): SerializedGame {
    return this.snapshot as unknown as SerializedGame;
  }

  public view(actorId: PlayerId): PlayerViewModel {
    return {...this.viewTemplate, id: actorId};
  }

  public prompt(_actorId: PlayerId): EnginePromptSnapshot | null {
    return this.promptValue;
  }

  public applyInput(): void {
    throw new Error('The gateway must use applyCandidate, not applyInput');
  }
}

export type FakeCounterEngineOptions = {
  prompt: EnginePromptSnapshot;
  view: PlayerViewModel;
  /** When true the port reports that an undo would hide information. */
  revealed?: boolean;
};

export class FakeCounterEngine implements ActionEnginePort {
  public revealed: boolean;
  public readonly prompt: EnginePromptSnapshot;
  public readonly viewTemplate: PlayerViewModel;
  public applyCalls = 0;

  public constructor(options: FakeCounterEngineOptions) {
    this.prompt = options.prompt;
    this.viewTemplate = options.view;
    this.revealed = options.revealed === true;
  }

  public load(snapshot: SerializedGame): ActionEngineState {
    return new CounterState(
      JSON.parse(JSON.stringify(snapshot)) as CounterSnapshot,
      this.prompt,
      this.viewTemplate,
    );
  }

  public applyCandidate(state: ActionEngineState, actorId: PlayerId, _input: InputResponse): ActionEngineState {
    this.applyCalls++;
    const next = JSON.parse(JSON.stringify(state.serialize())) as CounterSnapshot;
    next.counter = (next.counter ?? 0) + 1;
    next.lastActor = actorId;
    return new CounterState(next, this.prompt, this.viewTemplate);
  }

  public revealsHiddenInformation(): boolean {
    return this.revealed;
  }
}

/** Same deterministic behaviour, but without the undo safety capability. */
export class CapabilityLessCounterEngine implements ActionEnginePort {
  private readonly delegate: FakeCounterEngine;

  public constructor(options: FakeCounterEngineOptions) {
    this.delegate = new FakeCounterEngine(options);
  }

  public load(snapshot: SerializedGame): ActionEngineState {
    return this.delegate.load(snapshot);
  }

  public applyCandidate(state: ActionEngineState, actorId: PlayerId, input: InputResponse): ActionEngineState {
    return this.delegate.applyCandidate(state, actorId, input);
  }
}
