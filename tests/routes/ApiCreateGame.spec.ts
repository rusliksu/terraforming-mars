import {expect} from 'chai';
import {BoardName} from '../../src/common/boards/BoardName';
import {ApiCreateGame, isTelegramIdValid, normalizeTelegramId} from '../../src/server/routes/ApiCreateGame';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';
import {NewGameConfig} from '../../src/common/game/NewGameConfig';
import {RandomBoardOption} from '../../src/common/boards/RandomBoardOption';
import {RandomMAOptionType} from '../../src/common/ma/RandomMAOptionType';
import {SimpleGameModel} from '../../src/common/models/SimpleGameModel';
import {GENUINE_GOLD_NAME} from '../../src/common/Color';

function newGameConfig(players: NewGameConfig['players']): NewGameConfig {
  return {
    players,
    expansions: {
      corpera: true,
      promo: false,
      venus: false,
      colonies: false,
      prelude: false,
      prelude2: false,
      turmoil: false,
      community: false,
      ares: false,
      moon: false,
      pathfinders: false,
      ceo: false,
      starwars: false,
      underworld: false,
    },
    board: RandomBoardOption.OFFICIAL,
    seed: 0,
    randomFirstPlayer: false,
    clonedGamedId: undefined,
    undoOption: false,
    showTimers: false,
    fastModeOption: false,
    showOtherPlayersVP: false,
    aresExtremeVariant: false,
    politicalAgendasExtension: 'Standard',
    solarPhaseOption: false,
    removeNegativeGlobalEventsOption: false,
    modularMA: false,
    draftVariant: false,
    initialDraft: false,
    preludeDraftVariant: false,
    ceosDraftVariant: false,
    startingCorporations: 0,
    shuffleMapOption: false,
    randomMA: RandomMAOptionType.NONE,
    includeFanMA: false,
    soloTR: false,
    customCorporationsList: [],
    bannedCards: [],
    includedCards: [],
    customColoniesList: [],
    customPreludes: [],
    requiresMoonTrackCompletion: false,
    requiresVenusTrackCompletion: false,
    moonStandardProjectVariant: false,
    moonStandardProjectVariant1: false,
    altVenusBoard: false,
    escapeVelocity: undefined,
    twoCorpsVariant: false,
    customCeos: [],
    startingCeos: 0,
    startingPreludes: 0,
  };
}

describe('ApiCreateGame', () => {
  let scaffolding: RouteTestScaffolding;
  let req: MockRequest;
  let res: MockResponse;
  let apiCreateGame: ApiCreateGame;

  beforeEach(() => {
    req = new MockRequest();
    res = new MockResponse();
    scaffolding = new RouteTestScaffolding(req);
    apiCreateGame = new ApiCreateGame({limit: 99999, perMs: 1});
  });

  it('Official random boards do not include fan maps', () => {
    expect(ApiCreateGame.boardOptions(RandomBoardOption.OFFICIAL)).deep.eq([BoardName.THARSIS, BoardName.HELLAS, BoardName.ELYSIUM]);
  });
  it('Fully random boards do include fan maps', () => {
    expect(ApiCreateGame.boardOptions(RandomBoardOption.ALL)).deep.eq([
      BoardName.THARSIS,
      BoardName.HELLAS,
      BoardName.ELYSIUM,
      BoardName.UTOPIA_PLANITIA,
      BoardName.VASTITAS_BOREALIS_NOVA,
      BoardName.TERRA_CIMMERIA_NOVA,
      BoardName.ARABIA_TERRA,
      BoardName.VASTITAS_BOREALIS,
      BoardName.AMAZONIS,
      BoardName.TERRA_CIMMERIA,
      BoardName.HOLLANDIA,
    ]);
  });

  it('no get', async () => {
    await scaffolding.get(apiCreateGame, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found');
  });

  it('normalizes telegram ids in shared helper', () => {
    expect(normalizeTelegramId(' 123456789 ')).eq('123456789');
    expect(normalizeTelegramId(undefined)).eq('');
    expect(isTelegramIdValid(' 123456789 ')).is.true;
    expect(isTelegramIdValid('   ')).is.true;
    expect(isTelegramIdValid('@bad-id')).is.false;
  });

  it('simple create', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(newGameConfig([{
        name: 'Robot',
        color: 'blue',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: false,
      }])));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));
    expect(res.statusCode).eq(statusCode.ok);
    expect(res.headers.get('Content-Type')).eq('application/json');
    const model = JSON.parse(res.content) as SimpleGameModel;
    expect(model.id).is.not.undefined;
    expect(model.id.startsWith('g')).is.true;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.players[0].name).eq('Robot');
  });

  it('forces GenuineGold name for gold players', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(newGameConfig([{
        name: 'Ilya',
        color: 'gold',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: false,
      }])));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));
    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.players[0].name).eq(GENUINE_GOLD_NAME);
    expect(game!.players[0].color).eq('gold');
  });

  it('rejects invalid telegram ids with bad request', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(newGameConfig([{
        name: 'Robot',
        color: 'blue',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: false,
        telegramID: '@bad-id',
      }])));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).to.contain('invalid telegram id for player 1');
  });

  it('trims blank telegram ids before game creation', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(newGameConfig([{
        name: 'Robot',
        color: 'blue',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: false,
        telegramID: '   ',
      }])));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));
    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.players[0].telegramID).eq('');
  });

  it('starts bot takeover for bot players during game creation', async () => {
    const starts = new Array<{gameId: string; playerId: string; serverId: string}>();
    apiCreateGame = new ApiCreateGame({limit: 99999, perMs: 1}, {
      start: ({gameId, playerId, serverId}) => {
        starts.push({gameId, playerId, serverId});
        return {gameId, playerId, pid: 321, startedAtMs: 1, logFile: 'bot.log'};
      },
      stop: () => undefined,
    });

    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(newGameConfig([{
        name: 'Robot',
        color: 'blue',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: true,
      }])));
      req.emitter.emit('end');
    });

    await Promise.all(([emit, post]));
    expect(res.statusCode).eq(statusCode.ok);

    const model = JSON.parse(res.content) as SimpleGameModel;
    expect(starts).deep.eq([{
      gameId: model.id,
      playerId: model.players[0].id,
      serverId: scaffolding.ctx.ids.serverId,
    }]);
    expect(model.botPlayers).deep.eq([model.players[0].id]);
  });

  it('red rover solo game', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitter.emit('data', JSON.stringify({players: [{name: 'a player', color: 'red'}]}));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.internalServerError);
  });
});
