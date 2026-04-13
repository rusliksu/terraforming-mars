import {expect} from 'chai';
import {ApiBotTakeover} from '../../src/server/routes/ApiBotTakeover';
import {Game} from '../../src/server/Game';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {TestPlayer} from '../TestPlayer';
import {statusCode} from '../../src/common/http/statusCode';

describe('ApiBotTakeover', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    scaffolding.req.method = 'POST';
  });

  it('requires serverId', async () => {
    const route = new ApiBotTakeover({
      list: () => [],
      listPlayerIds: () => [],
      start: () => {
        throw new Error('should not start');
      },
      stop: () => undefined,
    });
    scaffolding.url = '/api/bot-takeover?action=start&gameId=g123456789abc&playerId=p123456789abc';
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.forbidden);
  });

  it('starts bot takeover', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player);
    await scaffolding.ctx.gameLoader.add(game);

    const route = new ApiBotTakeover({
      list: () => [{gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}],
      listPlayerIds: () => [player.id],
      start: () => ({gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}),
      stop: () => undefined,
    });

    scaffolding.url = `/api/bot-takeover?action=start&gameId=${game.id}&playerId=${player.id}&serverId=1`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.ok);
    const json = JSON.parse(res.content);
    expect(json.action).eq('start');
    expect(json.botPlayers).deep.eq([player.id]);
    expect(json.entry.playerId).eq(player.id);
  });

  it('stops bot takeover', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player);
    await scaffolding.ctx.gameLoader.add(game);

    const route = new ApiBotTakeover({
      list: () => [],
      listPlayerIds: () => [],
      start: () => {
        throw new Error('should not start');
      },
      stop: () => ({gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}),
    });

    scaffolding.url = `/api/bot-takeover?action=stop&gameId=${game.id}&playerId=${player.id}&serverId=1`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.ok);
    const json = JSON.parse(res.content);
    expect(json.action).eq('stop');
    expect(json.botPlayers).deep.eq([]);
  });
});
