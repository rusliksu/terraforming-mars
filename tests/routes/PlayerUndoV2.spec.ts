import {expect} from 'chai';

import {ACTION_SCHEMA_VERSION, ActionErrorResponseV1, ActionUndoSuccessResponseV1} from '../../src/common/actionProtocol/ActionProtocol';
import {paths} from '../../src/common/app/paths';
import {GameId, PlayerId, SpectatorId} from '../../src/common/Types';
import {InMemoryActionStore} from '../../src/server/actionStore';
import {ACTION_GATEWAY_ENGINE_VERSION, ActionGateway, computePromptToken} from '../../src/server/actionGateway';
import {Game} from '../../src/server/Game';
import {Server} from '../../src/server/models/ServerModel';
import {PlayerUndoV2} from '../../src/server/routes/PlayerUndoV2';
import {TestPlayer} from '../TestPlayer';
import {FakeCounterEngine} from '../actionRecovery/FakeCounterEngine';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

const GAME_ID = 'g-undo-v2-spec' as GameId;
const SPECTATOR_ID = 'spectator-undo-v2' as SpectatorId;
const BLUE_USER = 'discord-undo-blue';
const SECRET = 'undo-route-secret';
const PROMPT = {type: 'or', fingerprint: 'undo-route-prompt'};
const INPUT = {type: 'or', index: 0, response: {type: 'option'}};

type Fixture = {
  scaffolding: RouteTestScaffolding;
  req: MockRequest;
  res: MockResponse;
  game: Game;
  blue: TestPlayer;
  red: TestPlayer;
  store: InMemoryActionStore;
  engine: FakeCounterEngine;
  gateway: ActionGateway;
};

async function newFixture(): Promise<Fixture> {
  const req = new MockRequest();
  const res = new MockResponse();
  const scaffolding = new RouteTestScaffolding(req);
  const blue = TestPlayer.BLUE.newPlayer({beginner: true});
  blue.user = BLUE_USER;
  const red = TestPlayer.RED.newPlayer({beginner: true});
  red.user = 'discord-undo-red';
  const game = Game.newInstance(GAME_ID, [blue, red], blue, SPECTATOR_ID);
  await scaffolding.ctx.gameLoader.add(game);
  const store = new InMemoryActionStore({now: () => 1_700_000_000_000});
  await store.initialize();
  const engine = new FakeCounterEngine({prompt: PROMPT, view: Server.getPlayerModel(blue)});
  const gateway = new ActionGateway({
    store,
    engine,
    engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
    promptTokenSecret: SECRET,
  });
  scaffolding.ctx.user = {id: BLUE_USER, username: 'undo-blue', discriminator: '0001'};
  return {scaffolding, req, res, game, blue, red, store, engine, gateway};
}

async function act(fixture: Fixture, actorId: PlayerId, user: string, baseRevision: number): Promise<void> {
  const raw = JSON.stringify({
    v: ACTION_SCHEMA_VERSION,
    gameId: GAME_ID,
    actionId: crypto.randomUUID(),
    baseRevision,
    promptToken: computePromptToken(SECRET, {gameId: GAME_ID, actorId, revision: baseRevision + 1, prompt: PROMPT}),
    engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
    input: INPUT,
  });
  const result = await fixture.gateway.handle({
    principal: {id: user},
    rawBody: raw,
    games: {getGame: async (id: GameId) => (id === GAME_ID ? fixture.game : undefined)},
  });
  expect(result.statusCode).eq(200);
}

function undoBody(baseRevision: number, actionId: string = crypto.randomUUID()): string {
  return JSON.stringify({
    v: ACTION_SCHEMA_VERSION,
    gameId: GAME_ID,
    actionId,
    baseRevision,
    engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
  });
}

async function postUndo(body: string, handler: PlayerUndoV2, fixture: Fixture): Promise<void> {
  // Each call gets a fresh response double; MockResponse appends to content.
  fixture.res = new MockResponse();
  fixture.scaffolding.url = '/' + paths.PLAYER_UNDO_V2;
  const post = fixture.scaffolding.post(handler, fixture.res);
  await Promise.resolve().then(() => {
    fixture.req.emitter.emit('data', Buffer.from(body));
    fixture.req.emitter.emit('end');
  });
  await post;
}

function readyHandler(fixture: Fixture): PlayerUndoV2 {
  return new PlayerUndoV2({bootstrap: () => ({kind: 'ready', gateway: fixture.gateway})});
}

describe('POST /player/undo/v2', () => {
  it('is registered as its own additive endpoint', () => {
    expect(paths.PLAYER_UNDO_V2).eq('player/undo/v2');
    expect(PlayerUndoV2.INSTANCE).instanceOf(PlayerUndoV2);
  });

  it('is disabled by default and answers 404 without touching the journal', async () => {
    const fixture = await newFixture();
    const handler = new PlayerUndoV2({bootstrap: () => ({kind: 'disabled'})});
    await postUndo(undoBody(0), handler, fixture);

    expect(fixture.res.statusCode).eq(404);
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('performs its own authentication', async () => {
    const fixture = await newFixture();
    delete fixture.scaffolding.ctx.user;
    await act(fixture, fixture.blue.id, BLUE_USER, 0);
    await postUndo(undoBody(1), readyHandler(fixture), fixture);

    expect(fixture.res.statusCode).eq(401);
    expect((JSON.parse(fixture.res.content) as ActionErrorResponseV1).code).eq('UNAUTHORIZED');
    expect(await fixture.store.listIntents(GAME_ID)).length(1);
  });

  it('appends an undo intent and returns the reverted head', async () => {
    const fixture = await newFixture();
    await act(fixture, fixture.blue.id, BLUE_USER, 0);
    await postUndo(undoBody(1), readyHandler(fixture), fixture);

    expect(fixture.res.statusCode).eq(200);
    expect(fixture.res.getHeader('Content-Type')).eq('application/json');
    const body = JSON.parse(fixture.res.content) as ActionUndoSuccessResponseV1;
    expect(body.status).eq('undone');
    expect(body.revision).eq(2);
    expect(body.appliedRevision).eq(2);
    expect(body.undoneRevision).eq(1);
    expect(body.view.id).eq(fixture.blue.id);
    expect(body.viewHash).match(/^[0-9a-f]{64}$/);
    expect(await fixture.store.listIntents(GAME_ID)).length(2);
  });

  it('refuses an undo that would hide revealed information', async () => {
    const fixture = await newFixture();
    await act(fixture, fixture.blue.id, BLUE_USER, 0);
    fixture.engine.revealed = true;

    await postUndo(undoBody(1), readyHandler(fixture), fixture);

    expect(fixture.res.statusCode).eq(422);
    const body = JSON.parse(fixture.res.content) as ActionErrorResponseV1;
    expect(body.code).eq('UNDO_HIDDEN_INFORMATION');
    expect(await fixture.store.listIntents(GAME_ID)).length(1);
  });

  it('rejects malformed envelopes without appending', async () => {
    const fixture = await newFixture();
    await act(fixture, fixture.blue.id, BLUE_USER, 0);

    await postUndo('{"v":1', readyHandler(fixture), fixture);
    expect(fixture.res.statusCode).eq(400);
    expect((JSON.parse(fixture.res.content) as ActionErrorResponseV1).code).eq('INVALID_SCHEMA');

    await postUndo(JSON.stringify({v: ACTION_SCHEMA_VERSION, gameId: GAME_ID}), readyHandler(fixture), fixture);
    expect(fixture.res.statusCode).eq(400);
    expect(await fixture.store.listIntents(GAME_ID)).length(1);
  });
});
