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
import {IGame} from '../../src/server/IGame';
import {FakeGameLoader} from './FakeGameLoader';
import {
  GENUINE_GOLD_NAME,
} from '../../src/common/Color';
import * as constants from '../../src/common/constants';
import {FakeClock} from '../common/FakeClock';

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
      deltaProject: false,
    },
    board: RandomBoardOption.OFFICIAL,
    seed: 0,
    randomFirstPlayer: false,
    clonedGamedId: undefined,
    undoOption: false,
    showTimers: false,
    fastModeOption: false,
    showOtherPlayersVP: false,
    privateHands: true,
    noEloGame: false,
    turnBasedGame: false,
    botGame: false,
    aresExtremeVariant: false,
    politicalAgendasExtension: 'Standard',
    solarPhaseOption: false,
    removeNegativeGlobalEventsOption: false,
    modularMA: false,
    draftVariant: false,
    initialDraft: false,
    initialDraftOneWay: false,
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

class DelayedAddGameLoader extends FakeGameLoader {
  public addFinished = false;

  public override async add(game: IGame): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    await super.add(game);
    this.addFinished = true;
  }
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
    apiCreateGame = new ApiCreateGame([{limit: 99999, perMs: 1}]);
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
    const config = newGameConfig([{
      name: 'Robot',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }]);
    config.seed = 0.123456789;
    config.undoStepOption = true;
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
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
    const token = game!.players[0].botTakeoverToken;
    expect(token).matches(/^[A-Za-z0-9_-]{32}$/);
    expect(model.players[0].botTakeoverToken).eq(token);
    expect(game!.rng.seed).eq(config.seed);
    expect(game!.gameOptions.undoStepOption).is.true;
    expect(game!.gameOptions.boardSelection).eq(RandomBoardOption.OFFICIAL);
    expect(ApiCreateGame.boardOptions(RandomBoardOption.OFFICIAL)).contains(game!.gameOptions.boardName);
  });

  it('creates distinct capabilities for human players', async () => {
    const config = newGameConfig([
      {name: 'One', color: 'blue', beginner: false, handicap: 0, first: true, isBot: false},
      {name: 'Two', color: 'red', beginner: false, handicap: 0, first: false, isBot: false},
    ]);
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });

    await Promise.all([emit, post]);

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const tokens = model.players.map((player) => player.botTakeoverToken);
    expect(tokens.every((token) => token !== undefined && /^[A-Za-z0-9_-]{32}$/.test(token))).is.true;
    expect(new Set(tokens).size).eq(2);
  });

  it('creates games with per-player prelude handicap', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot',
      color: 'blue',
      beginner: false,
      handicap: 0,
      preludeHandicap: 1,
      first: true,
      isBot: false,
    }]);
    config.expansions.prelude = true;
    config.startingCorporations = 2;
    config.startingPreludes = constants.PRELUDE_CARDS_DEALT_PER_PLAYER;

    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });

    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.players[0].preludeHandicap).eq(1);
  });

  it('creates training games with no ELO enabled', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }]);
    config.noEloGame = true;
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });

    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.noEloGame).eq(true);
  });

  it('creates games with private hands disabled', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }]);
    config.privateHands = false;
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });

    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.privateHands).eq(false);
  });

  it('creates games with one-way 10-card initial draft enabled', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot 1',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }, {
      name: 'Robot 2',
      color: 'red',
      beginner: false,
      handicap: 0,
      first: false,
      isBot: false,
    }]);
    config.initialDraft = true;
    config.initialDraftOneWay = true;
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });

    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.initialDraftOneWay).eq(true);
  });

  it('ignores one-way 10-card initial draft when initial draft is disabled', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot 1',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }, {
      name: 'Robot 2',
      color: 'red',
      beginner: false,
      handicap: 0,
      first: false,
      isBot: false,
    }]);
    config.initialDraft = false;
    config.initialDraftOneWay = true;
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });

    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.initialDraftOneWay).eq(false);
  });

  it('waits for player links to be registered before returning', async () => {
    const gameLoader = new DelayedAddGameLoader();
    scaffolding.ctx.gameLoader = gameLoader;
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
    expect(gameLoader.addFinished).is.true;
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.players[0].id);
    expect(game).is.not.undefined;
  });

  it('treats null cloned game id like no cloned game id', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }]);
    (config as unknown as {clonedGamedId: null}).clonedGamedId = null;

    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.players[0].name).eq('Robot');
  });

  it('treats null escape velocity like disabled escape velocity', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }]);
    (config as unknown as {escapeVelocity: null}).escapeVelocity = null;

    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.escapeVelocity).eq(undefined);
  });

  it('normalizes malformed escape velocity options to defaults', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const config = newGameConfig([{
      name: 'Robot',
      color: 'blue',
      beginner: false,
      handicap: 0,
      first: true,
      isBot: false,
    }]);
    config.escapeVelocity = {
      thresholdMinutes: -9999,
      bonusSectionsPerAction: -9999,
      penaltyPeriodMinutes: -12,
      penaltyVPPerPeriod: 999999,
    };

    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.escapeVelocity).deep.eq({
      thresholdMinutes: constants.DEFAULT_ESCAPE_VELOCITY_THRESHOLD,
      bonusSectionsPerAction: constants.DEFAULT_ESCAPE_VELOCITY_BONUS_SECONDS,
      penaltyPeriodMinutes: constants.DEFAULT_ESCAPE_VELOCITY_PERIOD,
      penaltyVPPerPeriod: constants.DEFAULT_ESCAPE_VELOCITY_PENALTY,
    });
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

  it('keeps typed player names from changing the selected colors', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      req.emitter.emit('data', JSON.stringify(newGameConfig([
        {name: 'GydRo', color: 'blue', beginner: false, handicap: 0, first: true, isBot: false},
        {name: 'Олеся', color: 'green', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'Паша', color: 'red', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'Тома', color: 'black', beginner: false, handicap: 0, first: false, isBot: false},
      ])));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);

    expect(game!.players.map((player) => [player.name, player.color])).deep.eq([
      ['GydRo', 'blue'],
      ['Олеся', 'green'],
      ['Паша', 'red'],
      ['Тома', 'black'],
    ]);
  });

  it('rejects invalid telegram ids in async mode with bad request', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      const config = newGameConfig([{
        name: 'Robot',
        color: 'blue',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: false,
        telegramID: '@bad-id',
      }]);
      config.turnBasedGame = true;
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).to.contain('invalid telegram id for player 1');
  });

  it('rejects missing telegram ids in async mode with bad request', async () => {
    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      const config = newGameConfig([{
        name: 'Robot',
        color: 'blue',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: false,
        telegramID: '   ',
      }]);
      config.turnBasedGame = true;
      req.emitter.emit('data', JSON.stringify(config));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).to.contain('missing telegram id for player 1');
  });

  it('ignores telegram ids when async mode is disabled', async () => {
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
    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as SimpleGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.players[0].telegramID).eq('');
    expect(game!.gameOptions.turnBasedGame).is.false;
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
    apiCreateGame = new ApiCreateGame([{limit: 99999, perMs: 1}], {
      start: ({gameId, playerId, serverId}) => {
        starts.push({gameId, playerId, serverId});
        return {gameId, playerId, pid: 321, startedAtMs: 1, logFile: 'bot.log'};
      },
      stop: () => undefined,
    });

    const post = scaffolding.post(apiCreateGame, res);
    const emit = Promise.resolve().then(() => {
      const config = newGameConfig([{
        name: 'Robot',
        color: 'blue',
        beginner: false,
        handicap: 0,
        first: true,
        isBot: true,
      }]);
      config.botGame = true;
      req.emitter.emit('data', JSON.stringify(config));
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
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(Array.from(game!.botPlayerIds)).deep.eq([model.players[0].id]);
    expect(game!.players[0].botTakeoverToken).is.undefined;
    expect(model.players[0].botTakeoverToken).is.undefined;
  });

  it('ignores bot player flags when bot mode is disabled', async () => {
    const starts = new Array<{gameId: string; playerId: string; serverId: string}>();
    apiCreateGame = new ApiCreateGame([{limit: 99999, perMs: 1}], {
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
    expect(starts).deep.eq([]);
    expect(model.botPlayers).deep.eq([]);
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(Array.from(game!.botPlayerIds)).deep.eq([]);
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

  // Issues one create-game POST against `handler`, using fresh request/response objects,
  // reusing `scaffolding.ctx` (and therefore its ip and clock) across calls.
  function postGame(handler: ApiCreateGame, request: MockRequest, response: MockResponse) {
    const post = handler.post(request, response, scaffolding.ctx);
    const emit = Promise.resolve().then(() => {
      request.emitter.emit('data', JSON.stringify({players: [{name: 'a player', color: 'red'}]}));
      request.emitter.emit('end');
    });
    return Promise.all([emit, post]);
  }

  it('a quota handler does not block while under its limit', async () => {
    const apiCreateGame = new ApiCreateGame([{limit: 1, perMs: 120_000}]);

    const req1 = new MockRequest();
    const res1 = new MockResponse();
    await postGame(apiCreateGame, req1, res1);
    expect(res1.statusCode).not.eq(statusCode.tooManyRequests);
  });

  it('a quota handler blocks once its limit is exceeded', async () => {
    const apiCreateGame = new ApiCreateGame([{limit: 1, perMs: 120_000}]);

    const req1 = new MockRequest();
    const res1 = new MockResponse();
    await postGame(apiCreateGame, req1, res1);
    expect(res1.statusCode).not.eq(statusCode.tooManyRequests);

    const req2 = new MockRequest();
    const res2 = new MockResponse();
    await postGame(apiCreateGame, req2, res2);
    expect(res2.statusCode).eq(statusCode.tooManyRequests);
    expect(res2.content).eq('Quota exceeded');
  });

  it('two quota handlers do not block while both are under their limits', async () => {
    const apiCreateGame = new ApiCreateGame([{limit: 99999, perMs: 1}, {limit: 99999, perMs: 1}]);

    const req1 = new MockRequest();
    const res1 = new MockResponse();
    await postGame(apiCreateGame, req1, res1);
    expect(res1.statusCode).not.eq(statusCode.tooManyRequests);
  });

  it('two quota handlers block when the first exceeds its limit and the second does not', async () => {
    const apiCreateGame = new ApiCreateGame([{limit: 1, perMs: 120_000}, {limit: 99999, perMs: 1}]);

    const req1 = new MockRequest();
    const res1 = new MockResponse();
    await postGame(apiCreateGame, req1, res1);
    expect(res1.statusCode).not.eq(statusCode.tooManyRequests);

    const req2 = new MockRequest();
    const res2 = new MockResponse();
    await postGame(apiCreateGame, req2, res2);
    expect(res2.statusCode).eq(statusCode.tooManyRequests);
    expect(res2.content).eq('Quota exceeded');
  });

  it('two quota handlers block when the first does not exceed its limit but the second does', async () => {
    const apiCreateGame = new ApiCreateGame([{limit: 99999, perMs: 1}, {limit: 1, perMs: 120_000}]);

    const req1 = new MockRequest();
    const res1 = new MockResponse();
    await postGame(apiCreateGame, req1, res1);
    expect(res1.statusCode).not.eq(statusCode.tooManyRequests);

    const req2 = new MockRequest();
    const res2 = new MockResponse();
    await postGame(apiCreateGame, req2, res2);
    expect(res2.statusCode).eq(statusCode.tooManyRequests);
    expect(res2.content).eq('Quota exceeded');
  });

  it('elapsed time restores a blocked quota', async () => {
    const apiCreateGame = new ApiCreateGame([{limit: 1, perMs: 120_000}]);
    const clock = scaffolding.ctx.clock as FakeClock;

    const req1 = new MockRequest();
    const res1 = new MockResponse();
    await postGame(apiCreateGame, req1, res1);
    expect(res1.statusCode).not.eq(statusCode.tooManyRequests);

    const req2 = new MockRequest();
    const res2 = new MockResponse();
    await postGame(apiCreateGame, req2, res2);
    expect(res2.statusCode).eq(statusCode.tooManyRequests);

    clock.millis += 120_001;

    const req3 = new MockRequest();
    const res3 = new MockResponse();
    await postGame(apiCreateGame, req3, res3);
    expect(res3.statusCode).not.eq(statusCode.tooManyRequests);
  });
});
