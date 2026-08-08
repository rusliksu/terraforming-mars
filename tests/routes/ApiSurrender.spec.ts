import {expect} from 'chai';
import {ApiSurrender} from '../../src/server/routes/ApiSurrender';
import {Game} from '../../src/server/Game';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {TestPlayer} from '../TestPlayer';
import {statusCode} from '../../src/common/http/statusCode';
import {AccessAuditRecordInput} from '../../src/server/server/AccessAudit';
import {Phase} from '../../src/common/Phase';

describe('ApiSurrender', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    scaffolding.req.method = 'POST';
  });

  it('records an irreversible player surrender', async () => {
    const alice = TestPlayer.BLACK.newPlayer();
    const bob = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('g123456789abc', [alice, bob], alice, 'spectatorid');
    game.phase = Phase.ACTION;
    game.generation = 1;
    await scaffolding.ctx.gameLoader.add(game);
    const auditEvents: Array<AccessAuditRecordInput> = [];
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    let stoppedPlayer: string | undefined;
    const route = new ApiSurrender({
      stop: (playerId) => {
        stoppedPlayer = playerId;
        return undefined;
      },
    });

    scaffolding.url = `/api/surrender?playerId=${alice.id}`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.ok);
    expect(game.surrenderedPlayerIds.has(alice.id)).eq(true);
    expect(stoppedPlayer).eq(alice.id);
    expect(JSON.parse(res.content).surrenderedPlayers).deep.eq([alice.id]);
    expect(auditEvents[0].event).eq('surrender_accepted');
    expect(auditEvents[0].path).eq('api/surrender');
    expect(auditEvents[0].metadata).deep.eq({authorization: 'player'});
  });

  it('rejects repeated surrender', async () => {
    const alice = TestPlayer.BLACK.newPlayer();
    const bob = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('g123456789abc', [alice, bob], alice, 'spectatorid');
    game.phase = Phase.ACTION;
    game.surrenderedPlayerIds.add(alice.id);
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = `/api/surrender?playerId=${alice.id}`;
    await new ApiSurrender({stop: () => undefined}).processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).contains('player already surrendered');
  });

  it('rejects surrender for an automated player', async () => {
    const bot = TestPlayer.BLACK.newPlayer();
    const human = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('g123456789abc', [bot, human], bot, 'spectatorid');
    game.phase = Phase.ACTION;
    game.setBotPlayerIds([bot.id]);
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = `/api/surrender?playerId=${bot.id}`;
    await new ApiSurrender({stop: () => undefined}).processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.badRequest);
    expect(game.surrenderedPlayerIds.has(bot.id)).eq(false);
  });

  it('rejects surrender outside the active turn', async () => {
    const alice = TestPlayer.BLACK.newPlayer();
    const bob = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('g123456789abc', [alice, bob], alice, 'spectatorid');
    game.phase = Phase.ACTION;
    await scaffolding.ctx.gameLoader.add(game);
    const route = new ApiSurrender({stop: () => undefined});

    scaffolding.url = `/api/surrender?playerId=${bob.id}`;
    await route.processRequest(scaffolding.req, res, scaffolding.ctx);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).contains('only the active player');
  });

  it('rejects surrender after the game ended', async () => {
    const alice = TestPlayer.BLACK.newPlayer();
    const bob = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('g123456789abc', [alice, bob], alice, 'spectatorid');
    game.phase = Phase.END;
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = `/api/surrender?playerId=${alice.id}`;
    await new ApiSurrender({stop: () => undefined}).processRequest(scaffolding.req, res, scaffolding.ctx);

    expect(res.statusCode).eq(statusCode.badRequest);
    expect(game.surrenderedPlayerIds.has(alice.id)).eq(false);
  });
});
