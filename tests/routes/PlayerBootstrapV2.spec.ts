import {expect} from 'chai';

import {ACTION_SCHEMA_VERSION, ActionBootstrapResponseV1, ActionErrorResponseV1} from '../../src/common/actionProtocol/ActionProtocol';
import {paths} from '../../src/common/app/paths';
import {GameId, SpectatorId} from '../../src/common/Types';
import {InMemoryActionStore} from '../../src/server/actionStore';
import {ACTION_GATEWAY_ENGINE_VERSION, ActionGateway} from '../../src/server/actionGateway';
import {Game} from '../../src/server/Game';
import {Server} from '../../src/server/models/ServerModel';
import {PlayerBootstrapV2} from '../../src/server/routes/PlayerBootstrapV2';
import {TestPlayer} from '../TestPlayer';
import {FakeCounterEngine} from '../actionRecovery/FakeCounterEngine';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

const GAME_ID = 'g-bootstrap-v2-spec' as GameId;
const SPECTATOR_ID = 'spectator-bootstrap-v2' as SpectatorId;
const BLUE_USER = 'discord-bootstrap-blue';
const SECRET = 'bootstrap-route-secret';
const PROMPT = {type: 'or', fingerprint: 'bootstrap-prompt'};

type Fixture = {
  scaffolding: RouteTestScaffolding;
  req: MockRequest;
  res: MockResponse;
  game: Game;
  player: TestPlayer;
  store: InMemoryActionStore;
  engine: FakeCounterEngine;
  gateway: ActionGateway;
};

async function newFixture(): Promise<Fixture> {
  const req = new MockRequest();
  const res = new MockResponse();
  const scaffolding = new RouteTestScaffolding(req);
  const player = TestPlayer.BLUE.newPlayer({beginner: true});
  player.user = BLUE_USER;
  const game = Game.newInstance(GAME_ID, [player], player, SPECTATOR_ID);
  await scaffolding.ctx.gameLoader.add(game);
  const store = new InMemoryActionStore({now: () => 1_700_000_000_000});
  await store.initialize();
  const engine = new FakeCounterEngine({prompt: PROMPT, view: Server.getPlayerModel(player)});
  const gateway = new ActionGateway({
    store,
    engine,
    engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
    promptTokenSecret: SECRET,
  });
  scaffolding.ctx.user = {id: BLUE_USER, username: 'bootstrap-blue', discriminator: '0001'};
  return {scaffolding, req, res, game, player, store, engine, gateway};
}

async function get(playerId: string, fixture: Fixture, handler: PlayerBootstrapV2): Promise<void> {
  // Each call gets a fresh response double; MockResponse appends to content.
  fixture.res = new MockResponse();
  fixture.scaffolding.url = '/' + paths.PLAYER_BOOTSTRAP_V2 + '?id=' + encodeURIComponent(playerId);
  await fixture.scaffolding.get(handler, fixture.res);
}

function readyHandler(fixture: Fixture): PlayerBootstrapV2 {
  return new PlayerBootstrapV2({bootstrap: () => ({kind: 'ready', gateway: fixture.gateway})});
}

describe('GET /player/input/v2/bootstrap', () => {
  it('is registered as an additive route next to the action endpoint', () => {
    expect(paths.PLAYER_BOOTSTRAP_V2).eq('player/input/v2/bootstrap');
    expect(paths.PLAYER_INPUT_V2).eq('player/input/v2');
    expect(PlayerBootstrapV2.INSTANCE).instanceOf(PlayerBootstrapV2);
  });

  it('is disabled by default and answers 404', async () => {
    const fixture = await newFixture();
    const handler = new PlayerBootstrapV2({bootstrap: () => ({kind: 'disabled'})});
    await get(fixture.player.id, fixture, handler);

    expect(fixture.res.statusCode).eq(404);
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('fails closed with 503 when no engine adapter is configured', async () => {
    const fixture = await newFixture();
    const handler = new PlayerBootstrapV2({bootstrap: () => ({kind: 'unavailable'})});
    await get(fixture.player.id, fixture, handler);

    expect(fixture.res.statusCode).eq(503);
    const body = JSON.parse(fixture.res.content) as ActionErrorResponseV1;
    expect(body.code).eq('PERSISTENCE_FAILURE');
    expect(fixture.res.content).not.contains('stack');
  });

  it('requires the seat owner and never exposes another player view', async () => {
    const fixture = await newFixture();
    delete fixture.scaffolding.ctx.user;
    await get(fixture.player.id, fixture, readyHandler(fixture));
    expect(fixture.res.statusCode).eq(403);

    fixture.scaffolding.ctx.user = {id: 'discord-intruder', username: 'x', discriminator: '0002'};
    await get(fixture.player.id, fixture, readyHandler(fixture));
    expect(fixture.res.statusCode).eq(403);
    expect(fixture.res.content).not.contains('view');
    expect(await fixture.store.getStream(GAME_ID)).eq(undefined);
  });

  it('issues revision, prompt token, engine identity and the recovered view', async () => {
    const fixture = await newFixture();
    await get(fixture.player.id, fixture, readyHandler(fixture));

    expect(fixture.res.statusCode).eq(200);
    expect(fixture.res.getHeader('Content-Type')).eq('application/json');
    expect(fixture.res.getHeader('Cache-Control')).eq('no-store');
    const body = JSON.parse(fixture.res.content) as ActionBootstrapResponseV1;
    expect(body.v).eq(ACTION_SCHEMA_VERSION);
    expect(body.status).eq('ready');
    expect(body.gameId).eq(GAME_ID);
    expect(body.playerId).eq(fixture.player.id);
    expect(body.revision).eq(0);
    expect(body.baseRevision).eq(0);
    expect(body.engineVersion).eq(ACTION_GATEWAY_ENGINE_VERSION);
    expect(body.view.id).eq(fixture.player.id);
    expect(body.viewRevision).eq(0);
    expect(body.viewHash).match(/^[0-9a-f]{64}$/);
    expect(body.promptToken).match(/^[0-9a-f]{64}$/);
    expect(body.promptType).eq(PROMPT.type);
    expect(fixture.res.content).not.contains('"seed"');
    expect(fixture.res.content).not.contains('"serialized"');
  });

  it('reports the journal head after accepted actions', async () => {
    const fixture = await newFixture();
    const handler = readyHandler(fixture);
    await get(fixture.player.id, fixture, handler);
    const first = JSON.parse(fixture.res.content) as ActionBootstrapResponseV1;

    const raw = JSON.stringify({
      v: ACTION_SCHEMA_VERSION,
      gameId: GAME_ID,
      actionId: 'b1f1f0a0-0000-4000-8000-000000000001',
      baseRevision: first.baseRevision,
      promptToken: first.promptToken,
      engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
      input: {type: 'or', index: 0, response: {type: 'option'}},
    });
    const applied = await fixture.gateway.handle({
      principal: {id: BLUE_USER},
      rawBody: raw,
      games: {getGame: async (id: GameId) => (id === GAME_ID ? fixture.game : undefined)},
    });
    expect(applied.statusCode).eq(200);

    await get(fixture.player.id, fixture, handler);
    const second = JSON.parse(fixture.res.content) as ActionBootstrapResponseV1;
    expect(second.revision).eq(1);
    expect(second.baseRevision).eq(1);
    expect(second.promptToken).match(/^[0-9a-f]{64}$/);
    expect(second.promptToken).not.eq(first.promptToken);
  });
});
