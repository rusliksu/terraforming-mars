import {expect} from 'chai';
import {ApiGame} from '../../src/server/routes/ApiGame';
import {Game} from '../../src/server/Game';
import {MockResponse} from './HttpMocks';
import {TestPlayer} from '../TestPlayer';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';
import {AccessAuditRecordInput} from '../../src/server/server/AccessAudit';

describe('ApiGame', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  it('no parameter', async () => {
    scaffolding.url = '/api/game';
    await scaffolding.get(ApiGame.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: missing id parameter');
  });

  it('invalid id', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    scaffolding.ctx.gameLoader.add(Game.newInstance('game-valid-id', [player], player, 'spectatorid'));
    scaffolding.url = '/api/game?id=invalidId';
    await scaffolding.get(ApiGame.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found: game not found');
  });

  it('valid id', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-valid-id', [player], player, 'spectatorid');
    scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = '/api/game?id=game-valid-id';
    await scaffolding.get(ApiGame.INSTANCE, res);
    // This test is probably brittle.
    const json = JSON.parse(res.content);
    json.expectedPurgeTimeMs = -1;
    json.name = 'game-name';
    expect(json).deep.eq(
      {
        'activePlayer': 'black',
        'expectedPurgeTimeMs': -1,
        'id': 'game-valid-id',
        'lastSoloGeneration': 14,
        'name': 'game-name',
        'phase': 'research',
        'players': [
          {
            'color': 'black',
            'id': 'p-black-id',
            'isSurrendered': false,
            'name': 'player-black',
          },
        ],
        'spectatorId': 'spectatorid',
        'gameOptions': {
          'altVenusBoard': false,
          'aresExtremeVariant': false,
          'bannedCards': [],
          'boardName': 'tharsis',
          'draftVariant': false,
          'expansions': {
            'ares': false,
            'ceo': false,
            'colonies': false,
            'community': false,
            'corpera': true,
            'deltaProject': false,
            'moon': false,
            'pathfinders': false,
            'prelude': false,
            'prelude2': false,
            'promo': false,
            'starwars': false,
            'turmoil': false,
            'underworld': false,
            'venus': false,
          },
          'fastModeOption': false,
          'includedCards': [],
          'includeFanMA': false,
          'initialDraftVariant': false,
          'initialDraftOneWay': false,
          'ceosDraftVariant': false,
          'noEloGame': false,
          'privateHands': true,
          'turnBasedGame': false,
          'politicalAgendasExtension': 'Standard',
          'preludeDraftVariant': false,
          'randomMA': 'No randomization',
          'removeNegativeGlobalEvents': false,
          'requiresMoonTrackCompletion': false,
          'requiresVenusTrackCompletion': false,
          'showOtherPlayersVP': false,
          'showTimers': true,
          'shuffleMapOption': false,
          'solarPhaseOption': false,
          'soloTR': false,
          'twoCorpsVariant': false,
          'undoOption': false,
          'undoStepOption': false,
        },
      },
    );
    expect(res.content).not.contain('must-not-be-public');
  });

  it('audits successful game access', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-valid-id', [player], player, 'spectatorid');
    scaffolding.ctx.gameLoader.add(game);
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    scaffolding.req.headers['user-agent'] = 'Browser A';
    scaffolding.url = '/api/game?id=game-valid-id';

    await scaffolding.get(ApiGame.INSTANCE, res);

    expect(auditEvents).deep.eq([{
      event: 'game_home',
      method: 'GET',
      path: 'api/game',
      gameId: game.id,
      participantId: game.id,
      participantKind: 'game',
      clientIp: scaffolding.ctx.clientIp,
      userAgent: 'Browser A',
    }]);
  });

  it('includes active bot players for admin requests', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    scaffolding.ctx.gameLoader.add(Game.newInstance('game-valid-id', [player], player, 'spectatorid'));
    scaffolding.url = '/api/game?id=game-valid-id&serverId=1';
    const route = new ApiGame({
      listPlayerIds: () => [player.id],
    } as any);
    await scaffolding.get(route, res);
    const json = JSON.parse(res.content);
    expect(json.botPlayers).deep.eq([player.id]);
  });

  it('does not expose null escape velocity options', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-valid-id', [player], player, 'spectatorid');
    (game.gameOptions as any).escapeVelocity = null;
    scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = '/api/game?id=game-valid-id';

    await scaffolding.get(ApiGame.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const json = JSON.parse(res.content);
    expect(json.gameOptions).not.have.property('escapeVelocity');
  });
});
