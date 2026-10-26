import {expect} from 'chai';
import crypto from 'crypto';

import {ACTION_SCHEMA_VERSION, ActionRequestV1, ActionSuccessResponseV1} from '../../src/common/actionProtocol/ActionProtocol';
import {GameId} from '../../src/common/Types';
import {InMemoryActionStore} from '../../src/server/actionStore';
import {
  ACTION_GATEWAY_ENGINE_VERSION,
  ActionGateway,
  EngineFacadeCandidatePort,
  computePromptToken,
} from '../../src/server/actionGateway';
import {getBehaviorExecutor} from '../../src/server/behavior/BehaviorExecutor';
import {EnginePromptSnapshot, promptSnapshot} from '../../src/server/engine/EngineCanonical';
import {
  EngineConfig,
  EngineFacade,
  EngineHandle,
  createDeterministicEngineDependencies,
} from '../../src/server/engine/worker';
import {globalInitialize} from '../../src/server/globalInitialize';
import {firstInput} from './InitialCardsTestHelper';

const USER = 'discord-engine-integration';
const SECRET = 'engine-integration-prompt-token-secret';
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
    idPrefix: 'g',
  });
  const handle = new EngineFacade(dependencies).create(config());
  handle.game.players[0].user = USER;
  return handle;
}

function asSuccess(body: unknown): ActionSuccessResponseV1 {
  return body as ActionSuccessResponseV1;
}

describe('ActionGateway with the real EngineFacade candidate port', () => {
  before(() => {
    ensureGlobalInitialized();
  });

  it('applies a legal base+Prelude input and deduplicates the retry', async () => {
    const handle = newHandle();
    const game = handle.game;
    const actor = game.players[0];
    const prompt = promptSnapshot(actor);
    if (prompt === null) {
      throw new Error('Expected a base+Prelude prompt');
    }
    const input = firstInput(handle, actor.id);
    const store = new InMemoryActionStore({now: () => FIXED_NOW_MS});
    const engine = new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'g'});
    const gateway = new ActionGateway({
      store,
      engine,
      engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
      promptTokenSecret: SECRET,
    });
    await gateway.initialize();

    const request: ActionRequestV1 = {
      v: ACTION_SCHEMA_VERSION,
      gameId: game.id as GameId,
      actionId: crypto.randomUUID(),
      baseRevision: 0,
      promptToken: computePromptToken(SECRET, {
        gameId: game.id as GameId,
        actorId: actor.id,
        revision: 1,
        prompt: prompt as EnginePromptSnapshot,
      }),
      engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
      input,
    };
    const games = {
      getGame: (gameId: GameId) => Promise.resolve(gameId === game.id ? game : undefined),
    };

    const first = await gateway.handle({
      principal: {id: USER},
      rawBody: JSON.stringify(request),
      games,
    });
    expect(first.statusCode).eq(200);
    const firstBody = asSuccess(first.body);
    expect(firstBody.status).eq('applied');
    expect(firstBody.view.id).eq(actor.id);
    expect(firstBody.viewRevision).eq(1);
    expect(firstBody.revision).eq(1);
    expect(firstBody.viewHash).match(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(firstBody)).not.contains('"serialized"');
    expect(JSON.stringify(firstBody)).not.contains('"seed"');

    const intents = await store.listIntents(game.id as GameId);
    expect(intents).length(1);
    expect(intents[0].actorId).eq(actor.id);
    expect(intents[0].intentType).eq('player.input.v2');

    const second = await gateway.handle({
      principal: {id: USER},
      rawBody: JSON.stringify(request),
      games,
    });
    expect(second.statusCode).eq(200);
    expect(asSuccess(second.body).status).eq('duplicate');
    expect(asSuccess(second.body).appliedRevision).eq(1);
    expect(await store.listIntents(game.id as GameId)).length(1);
  });
});
