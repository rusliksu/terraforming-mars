import {expect} from 'chai';
import crypto from 'crypto';

import {ACTION_SCHEMA_VERSION, ActionErrorResponseV1, ActionRequestV1, ActionSuccessResponseV1, MAX_ACTION_REQUEST_BYTES} from '../../src/common/actionProtocol/ActionProtocol';
import {InputResponse} from '../../src/common/inputs/InputResponse';
import {GameId, PlayerId, SpectatorId} from '../../src/common/Types';
import {InMemoryActionStore} from '../../src/server/actionStore';
import {ActionGateway} from '../../src/server/actionGateway/ActionGateway';
import {
  ACTION_GATEWAY_ENGINE_VERSION,
  computePromptToken,
} from '../../src/server/actionGateway';
import {EnginePromptSnapshot} from '../../src/server/engine/EngineCanonical';
import {Game} from '../../src/server/Game';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {SelectOption} from '../../src/server/inputs/SelectOption';
import {Server} from '../../src/server/models/ServerModel';
import {TestPlayer} from '../TestPlayer';
import {FakeActionEngine} from './FakeActionEngine';

const GAME_ID = 'g-action-gateway-spec' as GameId;
const SPECTATOR_ID = 'spectator-spec' as SpectatorId;
const BLUE_USER = 'discord-blue-user';
const RED_USER = 'discord-red-user';
const SECRET = 'spec-prompt-token-secret';
const ENGINE_VERSION = ACTION_GATEWAY_ENGINE_VERSION;
const INITIAL_PROMPT: EnginePromptSnapshot = {type: 'or', fingerprint: 'prompt-a'};
const NEXT_PROMPT: EnginePromptSnapshot = {type: 'or', fingerprint: 'prompt-b'};
const OPTION_INPUT: InputResponse = {type: 'or', index: 0, response: {type: 'option'}};

type TestContext = {
  game: Game;
  blue: TestPlayer;
  red: TestPlayer;
  store: InMemoryActionStore;
  engine: FakeActionEngine;
  gateway: ActionGateway;
};

async function newContext(): Promise<TestContext> {
  const blue = TestPlayer.BLUE.newPlayer({beginner: true});
  blue.user = BLUE_USER;
  const red = TestPlayer.RED.newPlayer({beginner: true});
  red.user = RED_USER;
  const game = Game.newInstance(GAME_ID, [blue, red], blue, SPECTATOR_ID);
  blue.setWaitingFor(new OrOptions(new SelectOption('Option A'), new SelectOption('Option B')));

  const store = new InMemoryActionStore({now: () => 1_700_000_000_000});
  const engine = new FakeActionEngine({
    snapshot: game.serialize(),
    view: Server.getPlayerModel(blue),
    initialPrompt: INITIAL_PROMPT,
    nextPrompt: NEXT_PROMPT,
  });
  const gateway = new ActionGateway({
    store,
    engine,
    engineVersion: ENGINE_VERSION,
    promptTokenSecret: SECRET,
  });
  await gateway.initialize();
  return {game, blue, red, store, engine, gateway};
}

function promptToken(revision: number, prompt: EnginePromptSnapshot, actorId: PlayerId): string {
  return computePromptToken(SECRET, {gameId: GAME_ID, actorId, revision, prompt});
}

type EnvelopeOverrides = {
  gameId?: GameId;
  actionId?: string;
  baseRevision?: number;
  promptToken?: string;
  engineVersion?: string;
  input?: InputResponse;
};

function envelope(actor: TestPlayer, overrides: EnvelopeOverrides = {}): string {
  const value: ActionRequestV1 = {
    v: ACTION_SCHEMA_VERSION,
    gameId: overrides.gameId ?? GAME_ID,
    actionId: overrides.actionId ?? crypto.randomUUID(),
    baseRevision: overrides.baseRevision ?? 0,
    promptToken: overrides.promptToken ?? promptToken(1, INITIAL_PROMPT, actor.id),
    engineVersion: overrides.engineVersion ?? ENGINE_VERSION,
    input: overrides.input ?? OPTION_INPUT,
  };
  return JSON.stringify(value);
}

function sourceFor(context: TestContext) {
  return {
    getGame: (gameId: GameId) => Promise.resolve(gameId === context.game.id ? context.game : undefined),
  };
}

function handle(context: TestContext, rawBody: string, principalId: string = BLUE_USER) {
  return context.gateway.handle({
    principal: {id: principalId},
    rawBody,
    games: sourceFor(context),
  });
}

function asSuccess(body: unknown): ActionSuccessResponseV1 {
  return body as ActionSuccessResponseV1;
}

function asError(body: unknown): ActionErrorResponseV1 {
  return body as ActionErrorResponseV1;
}

describe('ActionGateway', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await newContext();
  });

  it('applies one authorized action and returns only a PlayerViewModel view', async () => {
    const result = await handle(context, envelope(context.blue));

    expect(result.statusCode).eq(200);
    const body = asSuccess(result.body);
    expect(body.status).eq('applied');
    expect(body.v).eq(ACTION_SCHEMA_VERSION);
    expect(body.revision).eq(1);
    expect(body.appliedRevision).eq(1);
    expect(body.viewRevision).eq(1);
    expect(body.view.id).eq(context.blue.id);
    expect(body.view).deep.eq(Server.getPlayerModel(context.blue));
    expect(body.viewHash).match(/^[0-9a-f]{64}$/);
    expect(body.promptToken).match(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(result.body)).not.contains('"serialized"');
    expect(JSON.stringify(result.body)).not.contains('"seed"');

    const stream = await context.store.getStream(GAME_ID);
    expect(stream?.revision).eq(1);
    const intents = await context.store.listIntents(GAME_ID);
    expect(intents).length(1);
    expect(intents[0].actorId).eq(context.blue.id);
    const storedPayload = intents[0].payload as Record<string, unknown>;
    expect(storedPayload.requestFingerprint).match(/^[0-9a-f]{64}$/);
    expect(storedPayload.promptTokenHash).match(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(intents[0].payload)).not.contains(promptToken(1, INITIAL_PROMPT, context.blue.id));
  });

  it('applies exactly one of 50 concurrent requests sharing one baseRevision', async () => {
    const requests: Array<Promise<{statusCode: number, body: unknown}>> = [];
    for (let index = 0; index < 50; index++) {
      requests.push(handle(context, envelope(context.blue, {
        actionId: crypto.randomUUID(),
        input: index % 2 === 0 ?
          OPTION_INPUT :
          {type: 'or', index: 1, response: {type: 'option'}} as InputResponse,
      })));
    }
    const results = await Promise.all(requests);
    const applied = results.filter((result) => result.statusCode === 200);
    const stale = results.filter((result) => {
      const body = asError(result.body);
      return result.statusCode === 409 && body.code === 'STALE_REVISION';
    });

    expect(applied).length(1);
    expect(stale).length(49);
    const stream = await context.store.getStream(GAME_ID);
    expect(stream?.revision).eq(1);
    expect(await context.store.listIntents(GAME_ID)).length(1);
  });

  it('returns a duplicate for the same actionId without a second effect', async () => {
    const actionId = crypto.randomUUID();
    const raw = envelope(context.blue, {actionId});
    const first = await handle(context, raw);
    const second = await handle(context, raw);

    expect(first.statusCode).eq(200);
    expect(asSuccess(first.body).status).eq('applied');
    expect(second.statusCode).eq(200);
    expect(asSuccess(second.body).status).eq('duplicate');
    expect(asSuccess(second.body).revision).eq(1);
    expect(asSuccess(second.body).appliedRevision).eq(1);
    expect(context.engine.applyCalls).eq(1);
    expect(await context.store.listIntents(GAME_ID)).length(1);
  });

  it('rejects the same actionId with a different payload as IDEMPOTENCY_CONFLICT', async () => {
    const actionId = crypto.randomUUID();
    const first = await handle(context, envelope(context.blue, {actionId}));
    expect(first.statusCode).eq(200);

    const second = await handle(context, envelope(context.blue, {
      actionId,
      input: {type: 'or', index: 1, response: {type: 'option'}},
    }));

    expect(second.statusCode).eq(409);
    expect(asError(second.body).code).eq('IDEMPOTENCY_CONFLICT');
    expect(asError(second.body).actionId).eq(actionId);
    expect(context.engine.applyCalls).eq(1);
    expect(await context.store.listIntents(GAME_ID)).length(1);
  });

  it('rejects a stale prompt token with 409 STALE_PROMPT and no mutation', async () => {
    const wrongPrompt: EnginePromptSnapshot = {type: 'option', fingerprint: 'not-the-current-prompt'};
    const result = await handle(context, envelope(context.blue, {
      promptToken: promptToken(1, wrongPrompt, context.blue.id),
    }));

    expect(result.statusCode).eq(409);
    expect(asError(result.body).code).eq('STALE_PROMPT');
    expect(asError(result.body).currentPromptToken).match(/^[0-9a-f]{64}$/);
    expect(context.engine.applyCalls).eq(0);
    expect(await context.store.getStream(GAME_ID)).eq(undefined);
  });

  it('rejects stale revisions with 409 STALE_REVISION and no mutation', async () => {
    const staleBeforeAnyAction = await handle(context, envelope(context.blue, {
      baseRevision: 3,
    }));
    expect(staleBeforeAnyAction.statusCode).eq(409);
    expect(asError(staleBeforeAnyAction.body).code).eq('STALE_REVISION');
    expect(asError(staleBeforeAnyAction.body).currentRevision).eq(0);
    expect(context.engine.applyCalls).eq(0);

    const first = await handle(context, envelope(context.blue));
    expect(first.statusCode).eq(200);

    const staleAfterOneAction = await handle(context, envelope(context.blue, {
      baseRevision: 0,
      promptToken: promptToken(1, INITIAL_PROMPT, context.blue.id),
    }));
    expect(staleAfterOneAction.statusCode).eq(409);
    expect(asError(staleAfterOneAction.body).code).eq('STALE_REVISION');
    expect(asError(staleAfterOneAction.body).currentRevision).eq(1);
    expect(context.engine.applyCalls).eq(1);
    expect(await context.store.listIntents(GAME_ID)).length(1);
  });

  it('derives the seat from ctx.user and rejects foreign or ambiguous principals', async () => {
    const foreign = await handle(context, envelope(context.blue), 'discord-intruder');
    expect(foreign.statusCode).eq(403);
    expect(asError(foreign.body).code).eq('UNAUTHORIZED');
    expect(JSON.stringify(foreign.body)).not.contains('view');
    expect(JSON.stringify(foreign.body)).not.contains(context.blue.id);

    const spectator = await handle(context, envelope(context.blue), SPECTATOR_ID);
    expect(spectator.statusCode).eq(403);

    context.red.user = BLUE_USER;
    const ambiguous = await handle(context, envelope(context.blue));
    expect(ambiguous.statusCode).eq(403);
  });

  it('rejects unknown games with 404 and no player data', async () => {
    const raw = envelope(context.blue, {gameId: 'g-unknown-game-spec' as GameId});
    const result = await handle(context, raw);
    expect(result.statusCode).eq(404);
    expect(asError(result.body).code).eq('UNAUTHORIZED');
    expect(JSON.stringify(result.body)).not.contains('view');
  });

  it('rejects malformed and oversized bodies with 4xx and no mutation', async () => {
    const malformed = await handle(context, '{"v":1');
    expect(malformed.statusCode).eq(400);
    expect(asError(malformed.body).code).eq('INVALID_SCHEMA');

    const extraField = await handle(context, JSON.stringify({
      ...JSON.parse(envelope(context.blue)),
      playerId: 'p-anyone',
    }));
    expect(extraField.statusCode).eq(400);

    const oversized = 'x'.repeat(MAX_ACTION_REQUEST_BYTES + 1);
    const tooLarge = await handle(context, oversized);
    expect(tooLarge.statusCode).eq(413);

    expect(context.engine.applyCalls).eq(0);
    expect(await context.store.getStream(GAME_ID)).eq(undefined);
  });

  it('fails closed on a retry after the candidate cache was lost', async () => {
    const actionId = crypto.randomUUID();
    const raw = envelope(context.blue, {actionId});
    const first = await handle(context, raw);
    expect(first.statusCode).eq(200);

    const restartedEngine = new FakeActionEngine({
      snapshot: context.game.serialize(),
      view: Server.getPlayerModel(context.blue),
      initialPrompt: INITIAL_PROMPT,
      nextPrompt: NEXT_PROMPT,
    });
    const restarted = new ActionGateway({
      store: context.store,
      engine: restartedEngine,
      engineVersion: ENGINE_VERSION,
      promptTokenSecret: SECRET,
    });
    await restarted.initialize();

    const retry = await restarted.handle({
      principal: {id: BLUE_USER},
      rawBody: raw,
      games: sourceFor(context),
    });
    expect(retry.statusCode).eq(409);
    expect(asError(retry.body).code).eq('STALE_REVISION');
    expect(restartedEngine.applyCalls).eq(0);
    expect(await context.store.listIntents(GAME_ID)).length(1);
  });

  it('fails closed when a legacy write drifted the live game from the v2 journal', async () => {
    const first = await handle(context, envelope(context.blue));
    expect(first.statusCode).eq(200);
    const nextToken = asSuccess(first.body).promptToken;
    if (nextToken === undefined) {
      throw new Error('Expected a next prompt token');
    }

    context.game.lastSaveId += 1;

    const second = await handle(context, envelope(context.blue, {
      baseRevision: 1,
      promptToken: nextToken,
      input: {type: 'or', index: 1, response: {type: 'option'}},
    }));
    expect(second.statusCode).eq(409);
    expect(asError(second.body).code).eq('STALE_REVISION');
    expect(await context.store.getStream(GAME_ID)).deep.contains({revision: 1});
    expect(await context.store.listIntents(GAME_ID)).length(1);
  });

  it('does not use runId or shadowInputSeq as revision', async () => {
    context.game.shadowInputSeq = 99;
    (context.game as unknown as {runId: string}).runId = 'client-run-id';

    const result = await handle(context, envelope(context.blue));
    expect(result.statusCode).eq(200);
    expect(asSuccess(result.body).revision).eq(1);
    expect(context.game.shadowInputSeq).eq(99);

    const stream = await context.store.getStream(GAME_ID);
    expect(stream?.revision).eq(1);
  });

  it('denies games outside the configured test cohort with 404', async () => {
    const store = new InMemoryActionStore();
    const engine = new FakeActionEngine({
      snapshot: context.game.serialize(),
      view: Server.getPlayerModel(context.blue),
      initialPrompt: INITIAL_PROMPT,
      nextPrompt: NEXT_PROMPT,
    });
    const gateway = new ActionGateway({
      store,
      engine,
      engineVersion: ENGINE_VERSION,
      promptTokenSecret: SECRET,
      allowedGameIds: new Set(['g-different-cohort' as GameId]),
    });
    await gateway.initialize();

    const result = await gateway.handle({
      principal: {id: BLUE_USER},
      rawBody: envelope(context.blue),
      games: sourceFor(context),
    });
    expect(result.statusCode).eq(404);
    expect(asError(result.body).code).eq('UNAUTHORIZED');
    expect(await store.getStream(GAME_ID)).eq(undefined);
  });

  it('rejects invalid input through the legality hook without a journal write', async () => {
    const store = new InMemoryActionStore();
    const engine = new FakeActionEngine({
      snapshot: context.game.serialize(),
      view: Server.getPlayerModel(context.blue),
      initialPrompt: INITIAL_PROMPT,
      nextPrompt: NEXT_PROMPT,
    });
    const gateway = new ActionGateway({
      store,
      engine,
      engineVersion: ENGINE_VERSION,
      promptTokenSecret: SECRET,
      legality: () => ({allowed: false, code: 'INVALID_ACTION'}),
    });
    const result = await gateway.handle({
      principal: {id: BLUE_USER},
      rawBody: envelope(context.blue),
      games: sourceFor(context),
    });

    expect(result.statusCode).eq(422);
    expect(asError(result.body).code).eq('INVALID_ACTION');
    expect(await store.getStream(GAME_ID)).eq(undefined);
  });
});
