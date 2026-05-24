import {expect} from 'chai';
import {ApiPlayer} from '../../src/server/routes/ApiPlayer';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {MockResponse} from './HttpMocks';
import {PlayerViewModel} from '../../src/common/models/PlayerModel';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';
import {Phase} from '../../src/common/Phase';

describe('ApiPlayer', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  it('no parameter', async () => {
    scaffolding.url = '/api/player';
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.content).eq('Bad request: missing id parameter');
  });

  it('fails invalid player id', async () => {
    scaffolding.url = '/api/player?id=googoo';
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.content).eq('Bad request: invalid player id');
  });

  it('fails game not found', async () => {
    scaffolding.url = '/api/player?id=p123';
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.content).eq('Not found');
  });

  it('pulls player', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    scaffolding.url = '/api/player?id=' + player.id;
    const game = Game.newInstance('game-id', [player], player, 'spectatorid', {privateHands: false});
    await scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    const response: PlayerViewModel = JSON.parse(res.content);
    expect(response.id).eq(player.id);
  });

  it('locks private-hands player page with a generated password after first access', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid', {privateHands: true});
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = '/api/player?id=' + player.id;
    await scaffolding.get(ApiPlayer.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const firstResponse: PlayerViewModel = JSON.parse(res.content);
    expect(firstResponse.id).eq(player.id);
    expect(firstResponse.password).to.be.a('string').and.not.eq('');
    const password = firstResponse.password;

    res = new MockResponse();
    scaffolding.url = '/api/player?id=' + player.id;
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.forbidden);

    res = new MockResponse();
    scaffolding.url = '/api/player?id=' + player.id + '&password=wrong';
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.forbidden);

    res = new MockResponse();
    scaffolding.url = '/api/player?id=' + player.id + '&password=' + password;
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.ok);
    const unlockedResponse: PlayerViewModel = JSON.parse(res.content);
    expect(unlockedResponse.id).eq(player.id);
    expect(unlockedResponse.password).eq(password);
  });

  it('does not require player password when private hands are disabled', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid', {privateHands: false});
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = '/api/player?id=' + player.id;
    await scaffolding.get(ApiPlayer.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const response: PlayerViewModel = JSON.parse(res.content);
    expect(response.password).eq(undefined);
  });

  it('does not require player password after the game ends', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid', {privateHands: true});
    player.password = 'existing-password';
    game.phase = Phase.END;
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = '/api/player?id=' + player.id;
    await scaffolding.get(ApiPlayer.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const response: PlayerViewModel = JSON.parse(res.content);
    expect(response.id).eq(player.id);
    expect(response.password).eq(undefined);
  });

  it('allows serverId override for claimed player', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    player.user = 'discord-user' as any;
    scaffolding.url = '/api/player?id=' + player.id + '&serverId=1';
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    const response: PlayerViewModel = JSON.parse(res.content);
    expect(response.id).eq(player.id);
  });
});
