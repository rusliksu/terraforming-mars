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

  it('allows player bot takeover without serverId', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    const route = new ApiBotTakeover({
      list: () => [{gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}],
      listPlayerIds: () => [player.id],
      start: () => ({gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}),
      stop: () => undefined,
    });

    scaffolding.url = `/api/bot-takeover?action=start&gameId=${game.id}&playerId=${player.id}`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.ok);
    const json = JSON.parse(res.content);
    expect(json.action).eq('start');
    expect(json.botPlayers).deep.eq([player.id]);
  });

  it('starts bot takeover', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player, 'spectatorid');
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

  it('does not classify an originally automated player as a human leave', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player, 'spectatorid');
    game.setBotPlayerIds([player.id]);
    await scaffolding.ctx.gameLoader.add(game);

    const route = new ApiBotTakeover({
      list: () => [],
      listPlayerIds: () => [],
      start: () => ({gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}),
      stop: () => undefined,
    });

    scaffolding.url = `/api/bot-takeover?action=start&gameId=${game.id}&playerId=${player.id}`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.ok);
    expect(game.botTakeoverPlayerIds.has(player.id)).eq(false);
  });

  it('notifies players when bot takeover starts', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    let active = false;
    const notifications: Array<{recipients: Array<string>, botPlayer: string}> = [];

    const route = new ApiBotTakeover({
      list: () => active ? [{gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}] : [],
      listPlayerIds: () => active ? [player.id] : [],
      start: () => {
        active = true;
        return {gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'};
      },
      stop: () => undefined,
    }, (recipients, botPlayer) => {
      notifications.push({
        recipients: recipients.map((recipient) => recipient.id),
        botPlayer: botPlayer.id,
      });
    });

    scaffolding.url = `/api/bot-takeover?action=start&gameId=${game.id}&playerId=${player.id}&serverId=1`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.ok);
    expect(notifications).deep.eq([{recipients: [player.id], botPlayer: player.id}]);
    expect(game.botTakeoverPlayerIds.has(player.id)).eq(true);
  });

  it('does not notify players when bot takeover was already active', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    const notifications: Array<{recipients: Array<string>, botPlayer: string}> = [];

    const route = new ApiBotTakeover({
      list: () => [{gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}],
      listPlayerIds: () => [player.id],
      start: () => ({gameId: game.id, playerId: player.id, pid: 321, startedAtMs: 1, logFile: 'bot.log'}),
      stop: () => undefined,
    }, (recipients, botPlayer) => {
      notifications.push({
        recipients: recipients.map((recipient) => recipient.id),
        botPlayer: botPlayer.id,
      });
    });

    scaffolding.url = `/api/bot-takeover?action=start&gameId=${game.id}&playerId=${player.id}&serverId=1`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.ok);
    expect(notifications).deep.eq([]);
  });

  it('stops bot takeover', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player, 'spectatorid');
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

  it('clears a pending takeover after a restart even when no child is active', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player, 'spectatorid');
    game.botTakeoverPlayerIds.add(player.id);
    await scaffolding.ctx.gameLoader.add(game);

    const route = new ApiBotTakeover({
      list: () => [],
      listPlayerIds: () => [],
      start: () => {
        throw new Error('should not start');
      },
      stop: () => undefined,
    });

    scaffolding.url = `/api/bot-takeover?action=stop&gameId=${game.id}&playerId=${player.id}`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.ok);
    expect(game.botTakeoverPlayerIds.has(player.id)).eq(false);
  });
});
