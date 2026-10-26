import {expect} from 'chai';
import {ApiDeleteGame} from '../../src/server/routes/ApiDeleteGame';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '@/common/http/statusCode';

describe('ApiDeleteGame', () => {
  let res: MockResponse;
  let scaffolding: RouteTestScaffolding;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  async function deleteGame(url: string): Promise<void> {
    scaffolding.url = url;
    scaffolding.req.method = 'DELETE';
    await ApiDeleteGame.INSTANCE.processRequest(scaffolding.req, res, scaffolding.ctx);
  }

  it('validates server id', async () => {
    await deleteGame('/api/deletegame?id=game-id');
    expect(res.statusCode).eq(statusCode.forbidden);
  });

  it('rejects a malformed game id', async () => {
    await deleteGame('/api/deletegame?serverId=1&id=not-a-game');
    expect(res.statusCode).eq(statusCode.badRequest);
  });

  it('returns 404 for an unknown game', async () => {
    await deleteGame('/api/deletegame?serverId=1&id=g123456789012');
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('deletes a game and forgets it', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    await scaffolding.ctx.gameLoader.add(Game.newInstance('g123456789012', [player], player, 's123456789012'));

    await deleteGame('/api/deletegame?serverId=1&id=g123456789012');

    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq('{"deleted":"g123456789012"}');
    expect(await scaffolding.ctx.gameLoader.getGame('g123456789012')).is.undefined;
  });
});
