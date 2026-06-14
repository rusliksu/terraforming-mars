import {expect} from 'chai';
import {ApiSpectator} from '../../src/server/routes/ApiSpectator';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {MockResponse} from './HttpMocks';
import {SpectatorModel} from '../../src/common/models/SpectatorModel';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {AccessAuditRecordInput} from '../../src/server/server/AccessAudit';

describe('ApiSpectator', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  it('fails game not found', async () => {
    scaffolding.url = '/api/spectator?id=googoo';
    await scaffolding.get(ApiSpectator.INSTANCE, res);
    expect(res.content).eq('Not found');
  });

  it('fails invalid id', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectator-id', undefined, undefined);
    scaffolding.url = '/api/spectator?id=' + player.id;
    scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiSpectator.INSTANCE, res);
    expect(res.content).eq('Not found');
  });

  it('pulls spectator', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectator-id', undefined, undefined);
    scaffolding.url = '/api/spectator?id=' + game.spectatorId;
    scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiSpectator.INSTANCE, res);
    const response: SpectatorModel = JSON.parse(res.content);
    expect(response.id).eq('spectator-id');
  });

  it('audits successful spectator access', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectator-id', undefined, undefined);
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    scaffolding.req.headers['user-agent'] = 'Browser A';
    scaffolding.url = '/api/spectator?id=' + game.spectatorId;
    scaffolding.ctx.gameLoader.add(game);

    await scaffolding.get(ApiSpectator.INSTANCE, res);

    expect(auditEvents).deep.eq([{
      event: 'spectator_view',
      method: 'GET',
      path: 'api/spectator',
      gameId: game.id,
      participantId: game.spectatorId,
      participantKind: 'spectator',
      clientIp: scaffolding.ctx.clientIp,
      userAgent: 'Browser A',
      metadata: {privateHandsVisible: false},
    }]);
  });
});
