import {expect} from 'chai';
import {ApiTurnNotice} from '../../src/server/routes/ApiTurnNotice';
import {Game} from '../../src/server/Game';
import {SelectOption} from '../../src/server/inputs/SelectOption';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {TestPlayer} from '../TestPlayer';
import {statusCode} from '../../src/common/http/statusCode';

describe('ApiTurnNotice', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    scaffolding.req.method = 'POST';
  });

  it('requires serverId', async () => {
    const route = new ApiTurnNotice({
      resend: async () => {
        throw new Error('should not resend');
      },
    });
    scaffolding.url = '/api/turn-notice?gameId=g123456789abc&playerId=p123456789abc';
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.forbidden);
  });

  it('requires player to be waiting for input', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player);
    player.popWaitingFor();
    player.telegramID = '123456';
    await scaffolding.ctx.gameLoader.add(game);

    const route = new ApiTurnNotice({
      resend: async () => {
        throw new Error('should not resend');
      },
    });

    scaffolding.url = `/api/turn-notice?gameId=${game.id}&playerId=${player.id}&serverId=1`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).includes('player is not waiting for input');
  });

  it('resends turn notice for a waiting player', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g123456789abc', [player], player);
    player.setWaitingFor(new SelectOption('Draft now'));
    player.telegramID = '123456';
    await scaffolding.ctx.gameLoader.add(game);

    const route = new ApiTurnNotice({
      resend: async (target, turnNoticeKey) => {
        target.lastNoticeMessageId = 91;
        target.lastTurnNoticeKey = turnNoticeKey;
        return true;
      },
    });

    scaffolding.url = `/api/turn-notice?gameId=${game.id}&playerId=${player.id}&serverId=1`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.ok);
    const json = JSON.parse(res.content);
    expect(json.action).eq('resend');
    expect(json.gameId).eq(game.id);
    expect(json.playerId).eq(player.id);
    expect(json.turnNoticeKey).eq(player.getTurnNoticeKey());
    expect(json.lastNoticeMessageId).eq(91);
  });
});
