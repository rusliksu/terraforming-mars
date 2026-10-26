import {expect} from 'chai';

import {InputResponse} from '../../src/common/inputs/InputResponse';
import {EngineFacadeCandidatePort, stateHashOf} from '../../src/server/actionGateway';
import {globalInitialize} from '../../src/server/globalInitialize';
import {getBehaviorExecutor} from '../../src/server/behavior/BehaviorExecutor';
import {UnsupportedEngineConfigError} from '../../src/server/engine/EngineErrors';
import {InputError} from '../../src/server/inputs/InputError';
import {
  EngineConfig,
  EngineFacade,
  EngineHandle,
  createDeterministicEngineDependencies,
} from '../../src/server/engine/worker';
import {firstInput} from './InitialCardsTestHelper';

const FIXED_NOW_MS = 1_700_000_000_000;

function config(): EngineConfig {
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
  };
}

function ensureGlobalInitialized(): void {
  try {
    getBehaviorExecutor();
  } catch (_error) {
    globalInitialize();
  }
}

function newHandle(): EngineHandle {
  const dependencies = createDeterministicEngineDependencies({
    nowMs: FIXED_NOW_MS,
    idPrefix: 'candidate-spec',
  });
  return new EngineFacade(dependencies).create(config());
}

describe('EngineFacadeCandidatePort', () => {
  before(() => {
    ensureGlobalInitialized();
  });

  it('loads a base+Prelude snapshot and applies one input to an isolated candidate', () => {
    const handle = newHandle();
    const snapshot = handle.serialize();
    const actorId = handle.game.players[0].id;
    const port = new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'candidate-spec'});

    const base = port.load(snapshot);
    const baseHash = stateHashOf(base.serialize());
    expect(base.gameId).eq(handle.game.id);
    expect(base.view(actorId).id).eq(actorId);
    expect(base.prompt(actorId)?.type).eq('initialCards');

    const response = firstInput(handle, actorId);
    const candidate = port.applyCandidate(base, actorId, response);

    expect(stateHashOf(base.serialize())).eq(baseHash);
    expect(base.prompt(actorId)?.type).eq('initialCards');
    expect(handle.game.getPlayerById(actorId).getWaitingFor()).not.eq(undefined);

    expect(stateHashOf(candidate.serialize())).not.eq(baseHash);
    expect(candidate.view(actorId).id).eq(actorId);
    expect(candidate.prompt(actorId)).eq(null);
  });

  it('rejects unsupported snapshots and invalid input without mutating the base state', () => {
    const handle = newHandle();
    const snapshot = handle.serialize();
    const actorId = handle.game.players[0].id;
    const port = new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'candidate-spec'});
    const base = port.load(snapshot);
    const baseHash = stateHashOf(base.serialize());

    const unsupported = handle.serialize();
    unsupported.gameOptions.expansions.colonies = true;
    expect(() => port.load(unsupported)).to.throw(UnsupportedEngineConfigError);

    const invalid: InputResponse = {type: 'option'};
    expect(() => port.applyCandidate(base, actorId, invalid)).to.throw(InputError);
    expect(base.prompt(actorId)?.type).eq('initialCards');
    expect(stateHashOf(base.serialize())).eq(baseHash);
  });
});
