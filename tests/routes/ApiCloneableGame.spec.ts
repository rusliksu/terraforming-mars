import {expect} from 'chai';
import {ApiCloneableGame} from '../../src/server/routes/ApiCloneableGame';
import {MockResponse} from './HttpMocks';
import {Database} from '../../src/server/database/Database';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {GameId} from '../../src/common/Types';
import {statusCode} from '../../src/common/http/statusCode';
import {BoardName} from '../../src/common/boards/BoardName';
import {RandomBoardOption} from '../../src/common/boards/RandomBoardOption';
import {RandomMAOptionType} from '../../src/common/ma/RandomMAOptionType';
import {SerializedGame} from '../../src/server/SerializedGame';

function makeSerializedGame(overrides: Record<string, unknown> = {}): SerializedGame {
  const defaultOptions = {
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
    boardName: BoardName.THARSIS,
    clonedGamedId: undefined,
    draftVariant: false,
    initialDraftVariant: false,
    initialDraftOneWay: false,
    preludeDraftVariant: false,
    ceosDraftVariant: false,
    randomMA: RandomMAOptionType.NONE,
    showOtherPlayersVP: false,
    privateHands: true,
    solarPhaseOption: false,
    shuffleMapOption: false,
    customCorporationsList: [],
    customColoniesList: [],
    customPreludes: [],
    bannedCards: [],
    includedCards: [],
    customCeos: [],
    politicalAgendasExtension: 'Standard',
    undoOption: false,
    showTimers: true,
    noEloGame: false,
    turnBasedGame: false,
    fastModeOption: false,
    removeNegativeGlobalEventsOption: false,
    includeFanMA: false,
    modularMA: false,
    startingCorporations: 2,
    soloTR: false,
    aresExtremeVariant: false,
    requiresVenusTrackCompletion: false,
    requiresMoonTrackCompletion: false,
    moonStandardProjectVariant: false,
    moonStandardProjectVariant1: false,
    altVenusBoard: false,
    twoCorpsVariant: false,
    startingCeos: 3,
    startingPreludes: 4,
  };
  const expansionOverrides = (overrides as {expansions?: Record<string, unknown>}).expansions ?? {};
  return {
    first: 'p1',
    players: [
      {id: 'p1', name: 'Alice', color: 'red', beginner: false, handicap: 0},
      {id: 'p2', name: 'Bob', color: 'blue', beginner: false, handicap: 0},
    ],
    gameOptions: {
      ...defaultOptions,
      ...overrides,
      expansions: {
        ...defaultOptions.expansions,
        ...expansionOverrides,
      },
    },
  } as unknown as SerializedGame;
}

describe('ApiCloneableGame', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  let originalGetGame: (gameId: GameId) => Promise<SerializedGame>;
  let originalGetPlayerCount: (gameId: GameId) => Promise<number>;
  let originalGetGameVersion: (gameId: GameId, saveId: number) => Promise<SerializedGame>;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    originalGetGame = Database.getInstance().getGame;
    originalGetPlayerCount = Database.getInstance().getPlayerCount;
    originalGetGameVersion = Database.getInstance().getGameVersion;
  });

  afterEach(() => {
    Database.getInstance().getGame = originalGetGame;
    Database.getInstance().getPlayerCount = originalGetPlayerCount;
    Database.getInstance().getGameVersion = originalGetGameVersion;
  });

  it('no parameter', async () => {
    scaffolding.url = '/api/cloneablegames';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: missing id parameter');
  });

  it('invalid id', async () => {
    scaffolding.url = '/api/cloneablegames?id=invalidId';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: invalid game id');
  });

  it('has error while loading', async () => {
    Database.getInstance().getPlayerCount = (_gameId) => {
      return new Promise((_resolve, reject) => {
        reject(new Error('Segmentation fault'));
      });
    };
    scaffolding.url = '/api/cloneablegames?id=gameIdInvalid';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found');
  });

  it('falls back to the latest game when initial save is missing for player count', async () => {
    const serialized = makeSerializedGame();
    Database.getInstance().getPlayerCount = (_gameId) => Promise.reject(new Error('missing save 0'));
    Database.getInstance().getGame = (_gameId) => Promise.reject(new Error('missing latest db save'));
    scaffolding.ctx.gameLoader.getGame = (_gameId) => Promise.resolve({
      players: serialized.players,
      serialize: () => serialized,
    } as any);

    scaffolding.url = '/api/cloneablegames?id=g456';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq(JSON.stringify({
      gameId: 'g456',
      playerCount: 2,
    }));
  });

  it('falls back to the latest game when initial save is missing for rematch setup', async () => {
    const serialized = makeSerializedGame({
      boardName: BoardName.HELLAS,
      expansions: {venus: true},
    });
    Database.getInstance().getPlayerCount = (_gameId) => Promise.reject(new Error('missing save 0'));
    Database.getInstance().getGameVersion = (_gameId, _saveId) => Promise.reject(new Error('missing save 0'));
    Database.getInstance().getGame = (_gameId) => Promise.reject(new Error('missing latest db save'));
    scaffolding.ctx.gameLoader.getGame = (_gameId) => Promise.resolve({
      players: serialized.players,
      serialize: () => serialized,
    } as any);

    scaffolding.url = '/api/cloneablegames?id=g456&setup=true';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const response = JSON.parse(res.content);
    expect(response.playerCount).eq(2);
    expect(response.setup.board).eq(BoardName.HELLAS);
    expect(response.setup.expansions.venus).eq(true);
    expect(response.setup.seededGame).eq(false);
  });

  it('finds game', async () => {
    Database.getInstance().getPlayerCount = (_gameId) => Promise.resolve(2);
    scaffolding.url = '/api/cloneablegames?id=g456';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.ok);
    expect(res.content).eq(JSON.stringify({
      gameId: 'g456',
      playerCount: 2,
    }));
  });

  it('returns rematch setup without enabling predefined clone mode', async () => {
    Database.getInstance().getPlayerCount = (_gameId) => Promise.resolve(2);
    Database.getInstance().getGameVersion = (_gameId, _saveId) => Promise.resolve({
      first: 'p1',
      players: [
        {id: 'p1', name: 'Alice', color: 'red', beginner: false, handicap: 0, telegramID: '111'},
        {id: 'p2', name: 'Bob', color: 'blue', beginner: true, handicap: 3, preludeHandicap: 1},
      ],
      gameOptions: {
        expansions: {
          corpera: true,
          promo: true,
          venus: true,
          colonies: false,
          prelude: true,
          prelude2: false,
          turmoil: false,
          community: false,
          ares: false,
          moon: false,
          pathfinders: true,
          ceo: true,
          starwars: false,
          underworld: false,
          deltaProject: false,
        },
        boardName: BoardName.ELYSIUM,
        clonedGamedId: '#old',
        draftVariant: true,
        initialDraftVariant: true,
        initialDraftOneWay: true,
        preludeDraftVariant: true,
        ceosDraftVariant: false,
        randomMA: RandomMAOptionType.LIMITED,
        showOtherPlayersVP: true,
        privateHands: false,
        solarPhaseOption: true,
        shuffleMapOption: true,
        customCorporationsList: [],
        customColoniesList: [],
        customPreludes: [],
        bannedCards: [],
        includedCards: [],
        customCeos: [],
        politicalAgendasExtension: 'Standard',
        undoOption: true,
        showTimers: true,
        noEloGame: true,
        turnBasedGame: true,
        fastModeOption: false,
        removeNegativeGlobalEventsOption: false,
        includeFanMA: false,
        modularMA: false,
        startingCorporations: 4,
        soloTR: false,
        aresExtremeVariant: false,
        requiresVenusTrackCompletion: false,
        requiresMoonTrackCompletion: false,
        moonStandardProjectVariant: false,
        moonStandardProjectVariant1: false,
        altVenusBoard: false,
        twoCorpsVariant: false,
        startingCeos: 3,
        startingPreludes: 4,
      },
    } as unknown as SerializedGame);

    scaffolding.url = '/api/cloneablegames?id=g456&setup=true';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const response = JSON.parse(res.content);
    expect(response.setup.players).deep.eq([
      {name: 'Alice', color: 'red', beginner: false, handicap: 0, preludeHandicap: 2, first: false, isBot: false},
      {name: 'Bob', color: 'blue', beginner: true, handicap: 3, preludeHandicap: 1, first: false, isBot: false},
    ]);
    expect(response.setup.board).eq(BoardName.ELYSIUM);
    expect(response.setup.clonedGamedId).eq(undefined);
    expect(response.setup.seededGame).eq(false);
    expect(response.setup.noEloGame).eq(true);
    expect(response.setup.privateHands).eq(false);
    expect(response.setup.initialDraftOneWay).eq(true);
    expect(response.setup.turnBasedGame).eq(true);
    expect(response.setup.botGame).eq(false);
    expect(response.setup.randomFirstPlayer).eq(true);
  });

  it('preserves random board selection for rematch setup', async () => {
    Database.getInstance().getPlayerCount = (_gameId) => Promise.resolve(2);
    Database.getInstance().getGameVersion = (_gameId, _saveId) => Promise.resolve({
      first: 'p1',
      players: [
        {id: 'p1', name: 'Alice', color: 'red', beginner: false, handicap: 0},
        {id: 'p2', name: 'Bob', color: 'blue', beginner: false, handicap: 0},
      ],
      gameOptions: {
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
        boardName: BoardName.HOLLANDIA,
        boardSelection: RandomBoardOption.ALL,
        clonedGamedId: undefined,
        draftVariant: false,
        initialDraftVariant: false,
        preludeDraftVariant: false,
        ceosDraftVariant: false,
        randomMA: RandomMAOptionType.NONE,
        showOtherPlayersVP: false,
        privateHands: true,
        solarPhaseOption: false,
        shuffleMapOption: false,
        customCorporationsList: [],
        customColoniesList: [],
        customPreludes: [],
        bannedCards: [],
        includedCards: [],
        customCeos: [],
        politicalAgendasExtension: 'Standard',
        undoOption: false,
        showTimers: true,
        noEloGame: false,
        turnBasedGame: false,
        fastModeOption: false,
        removeNegativeGlobalEventsOption: false,
        includeFanMA: false,
        modularMA: false,
        startingCorporations: 2,
        soloTR: false,
        aresExtremeVariant: false,
        requiresVenusTrackCompletion: false,
        requiresMoonTrackCompletion: false,
        moonStandardProjectVariant: false,
        moonStandardProjectVariant1: false,
        altVenusBoard: false,
        twoCorpsVariant: false,
        startingCeos: 3,
        startingPreludes: 4,
      },
    } as unknown as SerializedGame);

    scaffolding.url = '/api/cloneablegames?id=g456&setup=true';
    await scaffolding.get(ApiCloneableGame.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const response = JSON.parse(res.content);
    expect(response.setup.board).eq(RandomBoardOption.ALL);
  });
});
