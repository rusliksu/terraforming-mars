import {expect} from 'chai';
import {ApiPlayer} from '../../src/server/routes/ApiPlayer';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {MockResponse} from './HttpMocks';
import {PlayerViewModel} from '../../src/common/models/PlayerModel';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {AccessAuditRecordInput} from '../../src/server/server/AccessAudit';
import {statusCode} from '@/common/http/statusCode';

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
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: missing id parameter');
  });

  it('fails invalid player id', async () => {
    scaffolding.url = '/api/player?id=googoo';
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: invalid player id');
  });

  it('fails game not found', async () => {
    scaffolding.url = '/api/player?id=p123';
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found');
  });

  it('pulls player', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    scaffolding.url = '/api/player?id=' + player.id;
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiPlayer.INSTANCE, res);
    const response: PlayerViewModel = JSON.parse(res.content);
    expect(response.id).eq(player.id);
  });

  it('audits successful player access', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    scaffolding.req.headers['user-agent'] = 'Browser A';
    scaffolding.url = '/api/player?id=' + player.id;
    await scaffolding.ctx.gameLoader.add(game);

    await scaffolding.get(ApiPlayer.INSTANCE, res);

    expect(auditEvents).deep.eq([{
      event: 'player_view',
      method: 'GET',
      path: 'api/player',
      gameId: game.id,
      participantId: player.id,
      participantKind: 'player',
      clientIp: scaffolding.ctx.clientIp,
      userAgent: 'Browser A',
    }]);
  });

  it('audits denied player access', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLACK.newPlayer();
    player.user = 'discord-user' as any;
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    scaffolding.req.headers['user-agent'] = 'Browser A';
    scaffolding.url = '/api/player?id=' + player.id;
    await scaffolding.ctx.gameLoader.add(game);

    await scaffolding.get(ApiPlayer.INSTANCE, res);

    expect(auditEvents).deep.eq([{
      event: 'player_view_denied',
      method: 'GET',
      path: 'api/player',
      gameId: game.id,
      participantId: player.id,
      participantKind: 'player',
      clientIp: scaffolding.ctx.clientIp,
      userAgent: 'Browser A',
    }]);
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
