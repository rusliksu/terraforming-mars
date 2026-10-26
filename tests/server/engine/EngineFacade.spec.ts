import {expect} from 'chai';

import {Phase} from '../../../src/common/Phase';
import {InputResponse} from '../../../src/common/inputs/InputResponse';
import {PlayerId} from '../../../src/common/Types';
import {PlayerInput} from '../../../src/server/PlayerInput';
import {globalInitialize} from '../../../src/server/globalInitialize';
import {getBehaviorExecutor} from '../../../src/server/behavior/BehaviorExecutor';
import {
  EngineConfig,
  EngineFacade,
  EngineHandle,
  InMemoryPersistence,
  OrderedEngineInput,
  UnsupportedEngineConfigError,
  createDeterministicEngineDependencies,
  replayOrderedInputs,
  replayParityFingerprint,
} from '../../../src/server/engine/worker';

const FIXED_NOW_MS = 1_700_000_000_000;
const ID_PREFIX = 'spec';

function ensureGlobalInitialized(): void {
  try {
    getBehaviorExecutor();
  } catch (_error) {
    globalInitialize();
  }
}

function newFacade(): {facade: EngineFacade; persistence: InMemoryPersistence} {
  const dependencies = createDeterministicEngineDependencies({
    nowMs: FIXED_NOW_MS,
    idPrefix: ID_PREFIX,
  });
  return {
    facade: new EngineFacade(dependencies),
    persistence: dependencies.persistence as InMemoryPersistence,
  };
}

function config(overrides: Partial<EngineConfig> = {}): EngineConfig {
  return {
    version: 1,
    seed: 42,
    players: [
      {name: 'Alice', color: 'blue'},
      {name: 'Bob', color: 'red'},
    ],
    gameOptions: {
      preludeExtension: true,
      corporateEra: false,
    },
    ...overrides,
  };
}

type PromptModel = {
  type?: string;
  title?: string;
  options?: Array<PromptModel & {cards?: Array<{name: string}>; min?: number}>;
};

function chooseResponse(input: PlayerInput, model: PromptModel): InputResponse {
  switch (input.type) {
  case 'initialCards': {
    const options = (input as unknown as {options: Array<PlayerInput>}).options;
    return {
      type: 'initialCards',
      responses: options.map((option, index) => {
        const optionModel = model.options?.[index];
        if (optionModel?.title === 'Select initial cards to buy') {
          return {type: 'card', cards: []};
        }
        return chooseCardResponse(option as unknown as {cards: Array<{name: string}>; config?: {min?: number}}, optionModel);
      }),
    } as InputResponse;
  }
  case 'or': {
    const options = (input as unknown as {options: Array<PlayerInput>}).options;
    const passIndex = model.options?.findIndex((option) => String(option.title).includes('Pass for this generation')) ?? -1;
    if (passIndex >= 0) {
      return {type: 'or', index: passIndex, response: {type: 'option'}} as InputResponse;
    }
    return {
      type: 'or',
      index: 0,
      response: chooseResponse(options[0], model.options?.[0] ?? {}),
    } as InputResponse;
  }
  case 'card':
    return chooseCardResponse(input as unknown as {cards: Array<{name: string}>; config?: {min?: number}}, model);
  case 'space': {
    const spaces = (input as unknown as {spaces: Array<{id: string}>}).spaces;
    return {type: 'space', spaceId: spaces[0].id} as InputResponse;
  }
  case 'option':
    return {type: 'option'} as InputResponse;
  case 'amount': {
    const configuredMin = (input as unknown as {config?: {min?: number}}).config?.min;
    return {type: 'amount', amount: configuredMin ?? 1} as InputResponse;
  }
  case 'player': {
    const players = (input as unknown as {players: Array<{id: PlayerId}>}).players;
    return {type: 'player', player: players[0].id} as InputResponse;
  }
  default:
    throw new Error(`Unsupported prompt in base+Prelude scenario: ${input.type}`);
  }
}

function chooseCardResponse(
  input: {cards: Array<{name: string}>; config?: {min?: number}},
  _model?: PromptModel,
): InputResponse {
  const min = input.config?.min ?? 0;
  return {
    type: 'card',
    cards: input.cards.slice(0, min).map((card) => card.name),
  } as InputResponse;
}

/**
 * Prompt-driven planner. It is used only to produce the ordered input list;
 * parity is asserted by replaying the same explicit list on fresh engines.
 */
function planBasePreludeInputs(handle: EngineHandle, maxSteps = 20): Array<OrderedEngineInput> {
  const ordered: Array<OrderedEngineInput> = [];
  for (let index = 0; index < maxSteps; index++) {
    const actor = handle.game.players.find((player) => player.getWaitingFor() !== undefined);
    if (actor === undefined) {
      break;
    }
    const input = actor.getWaitingFor();
    if (input === undefined) {
      break;
    }
    const response = chooseResponse(input, input.toModel(actor) as PromptModel);
    ordered.push({actorId: actor.id, input: response});
    handle.applyInput(actor.id, response);
  }
  return ordered;
}

describe('host-neutral engine facade', () => {
  before(() => {
    ensureGlobalInitialized();
  });

  it('creates a base+Prelude game through explicit ports', () => {
    const {facade, persistence} = newFacade();
    const handle = facade.create(config());

    expect(handle.game.id).eq('spec-game-1');
    expect(handle.game.players.map((player) => player.id)).deep.eq(['spec-player-1', 'spec-player-2']);
    expect(handle.game.createdTime.getTime()).eq(FIXED_NOW_MS);
    expect(persistence.saveCount).greaterThan(0);
    expect(handle.prompts().map((prompt) => prompt.type)).deep.eq(['initialCards', 'initialCards']);
  });

  it('loads a serialized snapshot through the same ports', () => {
    const {facade} = newFacade();
    const created = facade.create(config());
    const snapshot = created.serialize();
    const loaded = facade.load(snapshot);

    expect(loaded.game.id).eq(created.game.id);
    expect(loaded.stateHash()).eq(created.stateHash());
    expect(loaded.prompts()).deep.eq(created.prompts());
  });

  it('replays the same seed, config, and ordered inputs to the same hashes and prompts', () => {
    const inputs = planBasePreludeInputs(newFacade().facade.create(config()));
    const inputsAgain = planBasePreludeInputs(newFacade().facade.create(config()));
    expect(inputs).deep.eq(inputsAgain);
    expect(inputs.length).eq(20);

    const first = replayOrderedInputs(newFacade().facade.create(config()), inputs);
    const second = replayOrderedInputs(newFacade().facade.create(config()), inputsAgain);

    expect(replayParityFingerprint(first)).deep.eq(replayParityFingerprint(second));
    expect(first.initialStateHash).eq(second.initialStateHash);
    expect(first.finalStateHash).eq(second.finalStateHash);
    expect(first.promptSequenceHash).eq(second.promptSequenceHash);
    expect(first.promptSequence).deep.eq(second.promptSequence);
    expect(first.finalStateHash).not.eq(first.initialStateHash);
  });

  it('routes game-end saves and completion through the persistence port', async () => {
    const {facade, persistence} = newFacade();
    const handle = facade.create(config());
    const saveCountBefore = persistence.saveCount;

    await (handle.game as unknown as {gotoEndGame(): Promise<void>}).gotoEndGame();

    expect(handle.game.phase).eq(Phase.END);
    expect(persistence.saveCount).greaterThan(saveCountBefore);
    expect(persistence.completedGameIds).deep.eq([handle.game.id]);
  });

  it('changes the canonical hash when rules state mutates', () => {
    const handle = newFacade().facade.create(config());
    const before = handle.stateHash();
    handle.game.players[0].megaCredits += 1;
    expect(handle.stateHash()).not.eq(before);
  });

  it('changes the canonical hash when the RNG cursor mutates', () => {
    const handle = newFacade().facade.create(config());
    const before = handle.stateHash();
    handle.game.rng.next();
    expect(handle.stateHash()).not.eq(before);
  });

  it('fails closed on unsupported configs', () => {
    const {facade} = newFacade();
    const badConfigs: Array<unknown> = [
      {...config(), gameOptions: {coloniesExtension: true}},
      {...config(), gameOptions: {customPreludes: []}},
      {...config(), version: 2},
      {...config(), seed: -1},
      {...config(), players: []},
      {...config(), players: [{name: 'Alice', color: 'blue'}, {name: 'Bob', color: 'blue'}]},
      {...config(), gameOptions: {expansions: {prelude: true, colonies: true}}},
    ];
    for (const badConfig of badConfigs) {
      expect(() => facade.create(badConfig as EngineConfig), JSON.stringify(badConfig)).to.throw(UnsupportedEngineConfigError);
    }
  });

  it('rejects unsupported serialized snapshots', () => {
    const {facade} = newFacade();
    const snapshot = facade.create(config()).serialize();
    snapshot.gameOptions.expansions.colonies = true;
    expect(() => facade.load(snapshot)).to.throw(UnsupportedEngineConfigError);
  });
});
