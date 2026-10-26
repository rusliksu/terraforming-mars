import {expect} from 'chai';
import crypto from 'crypto';

import {ACTION_ENDPOINT_PATH, ACTION_SCHEMA_VERSION, ActionErrorResponseV1, ActionRequestV1, ActionSuccessResponseV1, MAX_ACTION_REQUEST_BYTES} from '../../src/common/actionProtocol/ActionProtocol';
import {paths} from '../../src/common/app/paths';
import {InputResponse} from '../../src/common/inputs/InputResponse';
import {GameId, PlayerId, SpectatorId} from '../../src/common/Types';
import {InMemoryActionStore} from '../../src/server/actionStore';
import {ACTION_GATEWAY_ENGINE_VERSION, ActionGateway, computePromptToken} from '../../src/server/actionGateway';
import {EnginePromptSnapshot} from '../../src/server/engine/EngineCanonical';
import {Game} from '../../src/server/Game';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {SelectOption} from '../../src/server/inputs/SelectOption';
import {Server} from '../../src/server/models/ServerModel';
import {PlayerInput} from '../../src/server/routes/PlayerInput';
import {PlayerInputV2} from '../../src/server/routes/PlayerInputV2';
import {TestPlayer} from '../TestPlayer';
import {FakeActionEngine} from '../actionGateway/FakeActionEngine';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

const GAME_ID = 'g-player-input-v2-spec' as GameId;
const SPECTATOR_ID = 'spectator-v2-spec' as SpectatorId;
const BLUE_USER = 'discord-v2-blue';
const SECRET = 'route-spec-prompt-token-secret';
const PROMPT: EnginePromptSnapshot = {type: 'or', fingerprint: 'route-prompt-a'};
const NEXT_PROMPT: EnginePromptSnapshot = {type: 'or', fingerprint: 'route-prompt-b'};
const OPTION_INPUT: InputResponse = {type: 'or', index: 0, response: {type: 'option'}};

type Fixture = {
  scaffolding: RouteTestScaffolding;
  req: MockRequest;
  res: MockResponse;
  player: TestPlayer;
  game: Game;
  store: InMemoryActionStore;
  engine: FakeActionEngine;
  gateway: ActionGateway;
};

function newFixture(): Fixture {
  const req = new MockRequest();
  const res = new MockResponse();
  const scaffolding = new RouteTestScaffolding(req);
  const player = TestPlayer.BLUE.newPlayer({beginner: true});
  player.user = BLUE_USER;
  const game = Game.newInstance(GAME_ID, [player], player, SPECTATOR_ID);
  player.setWaitingFor(new OrOptions(new SelectOption('Option A'), new SelectOption('Option B')));
  void scaffolding.ctx.gameLoader.add(game);

  const store = new InMemoryActionStore({now: () => 1_700_000_000_000});
  const engine = new FakeActionEngine({
    snapshot: game.serialize(),
    view: Server.getPlayerModel(player),
    initialPrompt: PROMPT,
    nextPrompt: NEXT_PROMPT,
  });
  const gateway = new ActionGateway({
    store,
    engine,
    engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
    promptTokenSecret: SECRET,
  });
  return {scaffolding, req, res, player, game, store, engine, gateway};
}

function promptToken(actorId: PlayerId): string {
  return computePromptToken(SECRET, {
    gameId: GAME_ID,
    actorId,
    revision: 1,
    prompt: PROMPT,
  });
}

function envelope(actorId: PlayerId, overrides: Partial<ActionRequestV1> = {}): string {
  const value: ActionRequestV1 = {
    v: ACTION_SCHEMA_VERSION,
    gameId: GAME_ID,
    actionId: crypto.randomUUID(),
    baseRevision: 0,
    promptToken: promptToken(actorId),
    engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
    input: OPTION_INPUT,
    ...overrides,
  };
  return JSON.stringify(value);
}

function readyHandler(fixture: Fixture): PlayerInputV2 {
  return new PlayerInputV2({bootstrap: () => ({kind: 'ready', gateway: fixture.gateway})});
}

async function postBody(fixture: Fixture, handler: PlayerInputV2, body: string): Promise<void> {
  fixture.scaffolding.url = ACTION_ENDPOINT_PATH;
  const post = fixture.scaffolding.post(handler, fixture.res);
  await Promise.resolve().then(() => {
    fixture.req.emitter.emit('data', Buffer.from(body));
    fixture.req.emitter.emit('end');
  });
  await post;
}

function asError(body: unknown): ActionErrorResponseV1 {
  return body as ActionErrorResponseV1;
}

function asSuccess(body: unknown): ActionSuccessResponseV1 {
  return body as ActionSuccessResponseV1;
}

describe('PlayerInputV2 route', () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = newFixture();
    await fixture.store.initialize();
    fixture.scaffolding.ctx.user = {
      id: BLUE_USER,
      username: 'v2-blue',
      discriminator: '0001',
    };
  });

  it('is disabled by default configuration and answers 404 without reading state', async () => {
    const handler = new PlayerInputV2({bootstrap: () => ({kind: 'disabled'})});
    await postBody(fixture, handler, envelope(fixture.player.id));

    expect(fixture.res.statusCode).eq(404);
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
    expect(fixture.engine.applyCalls).eq(0);
  });

  it('fails closed with 503 when the flag has no engine adapter', async () => {
    const handler = new PlayerInputV2({bootstrap: () => ({kind: 'unavailable'})});
    await postBody(fixture, handler, envelope(fixture.player.id));

    expect(fixture.res.statusCode).eq(503);
    const body = asError(JSON.parse(fixture.res.content));
    expect(body.code).eq('PERSISTENCE_FAILURE');
    expect(body.retryable).eq(true);
    expect(fixture.res.content).not.contains('stack');
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('performs its own authentication instead of inheriting legacy auth:false', async () => {
    delete fixture.scaffolding.ctx.user;
    const handler = readyHandler(fixture);
    await postBody(fixture, handler, envelope(fixture.player.id));

    expect(fixture.res.statusCode).eq(401);
    const body = asError(JSON.parse(fixture.res.content));
    expect(body.code).eq('UNAUTHORIZED');
    expect(fixture.res.content).not.contains(fixture.player.id);
    expect(fixture.res.content).not.contains(GAME_ID);
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('rejects a foreign principal with 403 and no private data', async () => {
    fixture.scaffolding.ctx.user = {
      id: 'discord-v2-intruder',
      username: 'intruder',
      discriminator: '0002',
    };
    const handler = readyHandler(fixture);
    await postBody(fixture, handler, envelope(fixture.player.id));

    expect(fixture.res.statusCode).eq(403);
    expect(asError(JSON.parse(fixture.res.content)).code).eq('UNAUTHORIZED');
    expect(fixture.res.content).not.contains('view');
    expect(fixture.res.content).not.contains('seed');
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('applies a valid action and returns only the authorized view plus revisions', async () => {
    const handler = readyHandler(fixture);
    await postBody(fixture, handler, envelope(fixture.player.id));

    expect(fixture.res.statusCode).eq(200);
    expect(fixture.res.getHeader('Content-Type')).eq('application/json');
    const body = asSuccess(JSON.parse(fixture.res.content));
    expect(body.status).eq('applied');
    expect(body.v).eq(ACTION_SCHEMA_VERSION);
    expect(body.view.id).eq(fixture.player.id);
    expect(body.viewRevision).eq(1);
    expect(body.revision).eq(1);
    expect(body.viewHash).match(/^[0-9a-f]{64}$/);
    expect(fixture.res.content).not.contains('"_user"');
    expect(fixture.res.content).not.contains('"serialized"');
    expect(fixture.res.content).not.contains('"seed"');
    expect(fixture.res.content).not.contains(promptToken(fixture.player.id));
  });

  it('rejects malformed bodies with 400 and no mutation', async () => {
    const handler = readyHandler(fixture);
    await postBody(fixture, handler, '{"v":1');

    expect(fixture.res.statusCode).eq(400);
    expect(asError(JSON.parse(fixture.res.content)).code).eq('INVALID_SCHEMA');
    expect(fixture.engine.applyCalls).eq(0);
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('rejects oversized bodies with 413 and no mutation', async () => {
    const handler = readyHandler(fixture);
    await postBody(fixture, handler, 'x'.repeat(MAX_ACTION_REQUEST_BYTES + 1));

    expect(fixture.res.statusCode).eq(413);
    expect(asError(JSON.parse(fixture.res.content)).code).eq('INVALID_SCHEMA');
    expect(fixture.engine.applyCalls).eq(0);
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('leaves legacy /player/input behavior unchanged', async () => {
    expect(paths.PLAYER_INPUT).eq('player/input');
    expect(paths.PLAYER_INPUT_V2).eq('player/input/v2');
    expect(ACTION_ENDPOINT_PATH).eq('/player/input/v2');
    expect(PlayerInputV2.INSTANCE).not.eq(PlayerInput.INSTANCE);

    delete fixture.scaffolding.ctx.user;
    fixture.scaffolding.url = '/player/input?id=' + fixture.player.id;
    const post = fixture.scaffolding.post(PlayerInput.INSTANCE, fixture.res);
    await Promise.resolve().then(() => {
      fixture.req.emitter.emit('data', Buffer.from(JSON.stringify(OPTION_INPUT)));
      fixture.req.emitter.emit('end');
    });
    await post;

    expect(fixture.res.statusCode).eq(200);
    const model = JSON.parse(fixture.res.content) as {id?: string, status?: string};
    expect(model.id).eq(fixture.player.id);
    expect(model.status).eq(undefined);
  });
});
