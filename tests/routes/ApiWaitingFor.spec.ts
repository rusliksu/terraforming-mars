import {expect} from 'chai';
import {ApiWaitingFor} from '../../src/server/routes/ApiWaitingFor';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {GameId} from '../../src/common/Types';
import {statusCode} from '../../src/common/http/statusCode';
import {AccessAuditRecordInput} from '../../src/server/server/AccessAudit';

const originalAccessAuditWaitingFor = process.env.TM_ACCESS_AUDIT_WAITING_FOR;

describe('ApiWaitingFor', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  afterEach(() => {
    restoreEnv('TM_ACCESS_AUDIT_WAITING_FOR', originalAccessAuditWaitingFor);
  });

  it('fails when game not found', async () => {
    scaffolding.url = '/api/waitingfor?id=p-some-player-id&gameAge=123&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found: cannot find game for that player');
  });

  it('fails when player not found', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('g' + player.id as GameId, [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    (game as any).getPlayerById = () => {
      throw new Error('player does not exist');
    };

    scaffolding.url = '/api/waitingfor?id=' + player.id + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found: player not found');
  });

  it('sends model for player', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = '/api/waitingfor?id=' + player.id + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq('{"result":"GO","waitingFor":["black"]}');
  });

  it('does not refresh an optional draft repick when game age advances', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    player.getWaitingFor()!.optional = true;
    game.gameAge = 51;

    scaffolding.url = '/api/waitingfor?id=' + player.id + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq('{"result":"WAIT","waitingFor":["red"]}');
  });

  it('refreshes an optional draft repick after an undo', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    player.getWaitingFor()!.optional = true;
    game.undoCount = 1;

    scaffolding.url = '/api/waitingfor?id=' + player.id + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq('{"result":"REFRESH","waitingFor":[]}');
  });

  it('audits successful player polling', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    scaffolding.req.headers['user-agent'] = 'Browser A';

    scaffolding.url = '/api/waitingfor?id=' + player.id + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);

    expect(auditEvents).deep.eq([{
      event: 'waiting_for_player',
      method: 'GET',
      path: 'api/waitingfor',
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
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = '/api/waitingfor?id=' + player.id + '&gameAge=50&undoCount=0&serverId=1';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq('{"result":"GO","waitingFor":["black"]}');
  });

  it('fails when spectator not found', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    (game as any).getBySpectatorId = () => {
      throw new Error('spectator does not exist');
    };

    scaffolding.url = '/api/waitingfor?id=' + game.spectatorId + '-invalid' + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found: cannot find game for that player');
  });

  it('sends model for spectator', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 's-spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = '/api/waitingfor?id=' + game.spectatorId + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq('{"result":"WAIT","waitingFor":["black","red"]}');
  });

  it('skips spectator polling audit by default', async () => {
    delete process.env.TM_ACCESS_AUDIT_WAITING_FOR;
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 's-spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};

    scaffolding.url = '/api/waitingfor?id=' + game.spectatorId + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);

    expect(auditEvents).deep.eq([]);
  });

  it('audits spectator polling when explicitly enabled', async () => {
    process.env.TM_ACCESS_AUDIT_WAITING_FOR = '1';
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 's-spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    scaffolding.req.headers['user-agent'] = 'Browser A';

    scaffolding.url = '/api/waitingfor?id=' + game.spectatorId + '&gameAge=50&undoCount=0';
    await scaffolding.get(ApiWaitingFor.INSTANCE, res);

    expect(auditEvents).deep.eq([{
      event: 'waiting_for_spectator',
      method: 'GET',
      path: 'api/waitingfor',
      gameId: game.id,
      participantId: game.spectatorId,
      participantKind: 'spectator',
      clientIp: scaffolding.ctx.clientIp,
      userAgent: 'Browser A',
    }]);
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
