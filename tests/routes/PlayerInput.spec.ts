import {expect} from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {PlayerInput, playerInputMetrics} from '../../src/server/routes/PlayerInput';
import {MockRequest, MockResponse} from './HttpMocks';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {UndoActionOption} from '../../src/server/inputs/UndoActionOption';
import {SelectOption} from '../../src/server/inputs/SelectOption';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {cast} from '@/common/utils/utils';
import {OrOptionsResponse} from '../../src/common/inputs/InputResponse';
import {CardName} from '../../src/common/cards/CardName';
import {restoreTestGameLoader, setTestGameLoader} from '../testing/setup';
import {Payment} from '../../src/common/inputs/Payment';
import {AccessAuditRecordInput} from '../../src/server/server/AccessAudit';
import {testGame} from '../TestGame';
import {Phase} from '../../src/common/Phase';
import {ProjectEden} from '../../src/server/cards/prelude2/ProjectEden';
import {ArcticAlgae} from '../../src/server/cards/base/ArcticAlgae';
import {BiomassCombustors} from '../../src/server/cards/base/BiomassCombustors';
import {Comet} from '../../src/server/cards/base/Comet';
import {HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED} from '../../src/common/undo';
import {HiTechLab} from '../../src/server/cards/promo/HiTechLab';
import {LogMessageType} from '../../src/common/logs/LogMessageType';
import {BotTakeoverManager} from '../../src/server/bot/BotTakeoverManager';
import type {ErrorDiagnosticContext} from '../../src/server/server/SentryReporter';
import {InputError} from '../../src/server/inputs/InputError';
import {AppError} from '../../src/server/server/AppError';
import {INVALID_RUN_ID} from '../../src/common/app/AppErrorId';
import {runId} from '../../src/server/utils/server-ids';
import {statusCode} from '@/common/http/statusCode';
import {SelectCard} from '@/server/inputs/SelectCard';
import {Sponsors} from '@/server/cards/base/Sponsors';
import {PowerPlant} from '@/server/cards/base/PowerPlant';

type CapturedError = {
  error: unknown;
  context: ErrorDiagnosticContext;
};

function newBotManager(options: {startError?: Error} = {}) {
  let active = false;
  const starts: Array<Parameters<BotTakeoverManager['start']>[0]> = [];
  const manager: Pick<BotTakeoverManager, 'isActive' | 'start' | 'stop'> = {
    isActive: () => active,
    start: (startOptions) => {
      if (options.startError !== undefined) {
        throw options.startError;
      }
      active = true;
      starts.push(startOptions);
      return {
        gameId: startOptions.gameId,
        playerId: startOptions.playerId,
        pid: 123,
        startedAtMs: 1,
        logFile: 'bot.log',
      };
    },
    stop: () => {
      active = false;
      return undefined;
    },
  };
  return {manager, starts};
}
import {FakeClock} from '../common/FakeClock';
import {INVALID_REQUEST_ID, RESPONDING_TOO_QUICKLY} from '@/common/app/AppErrorId';

describe('PlayerInput', () => {
  let scaffolding: RouteTestScaffolding;
  let req: MockRequest;
  let res: MockResponse;
  let shadowLogDir: string | undefined;
  const originalShadowLog = process.env.SHADOW_LOG;
  const originalShadowLogDir = process.env.SHADOW_LOG_DIR;
  const originalShadowLogFilePrefix = process.env.SHADOW_LOG_FILE_PREFIX;
  const originalAllowUnauthenticated = process.env.ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT;

  beforeEach(() => {
    // These legacy route tests use unowned test seats. Production defaults to
    // closed; the explicit compatibility flag is covered separately.
    process.env.ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT = '1';
    req = new MockRequest();
    res = new MockResponse();
    scaffolding = new RouteTestScaffolding(req);
    setTestGameLoader(scaffolding.ctx.gameLoader);
  });

  afterEach(() => {
    restoreTestGameLoader();
    restoreEnv('SHADOW_LOG', originalShadowLog);
    restoreEnv('SHADOW_LOG_DIR', originalShadowLogDir);
    restoreEnv('SHADOW_LOG_FILE_PREFIX', originalShadowLogFilePrefix);
    restoreEnv('ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT', originalAllowUnauthenticated);
    if (shadowLogDir !== undefined) {
      fs.rmSync(shadowLogDir, {recursive: true, force: true});
      shadowLogDir = undefined;
    }
  });

  it('fails when id not provided', async () => {
    scaffolding.url = '/player/input';
    await scaffolding.post(PlayerInput.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: missing id parameter');
  });

  it('captures an unexpected player lookup failure without gameplay input', async () => {
    const captures: Array<CapturedError> = [];
    const handler = new PlayerInput((error, context) => captures.push({error, context}));
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid-player-get', [player], player, 'spectatorid');
    const lookupError = new Error('lookup failed');
    scaffolding.url = `/player/input?id=${player.id}&private=query-secret`;
    scaffolding.req.method = 'POST';
    scaffolding.req.headers.authorization = 'Bearer header-secret';
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    await scaffolding.ctx.gameLoader.add(game);
    game.getPlayerById = () => {
      throw lookupError;
    };

    await scaffolding.post(handler, res);

    expect(captures).deep.eq([{
      error: lookupError,
      context: {
        boundary: 'player-get',
        method: 'POST',
        route: '/player/input',
        gameId: game.id,
        playerId: player.id,
      },
    }]);
    expect(JSON.stringify(captures)).not.contains('query-secret');
    expect(JSON.stringify(captures)).not.contains('header-secret');
    expect(JSON.stringify(captures)).not.contains('203.0.113.10');
    expect(res.statusCode).eq(404);
  });

  it('performs undo action', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = '/player/input?id=' + player.id;
    const game = Game.newInstance('gameid-foo', [player], player, 'spectatorid');

    const undoVersionOfPlayer = TestPlayer.BLUE.newPlayer({beginner: true});
    const undo = Game.newInstance('gameid-old', [undoVersionOfPlayer], undoVersionOfPlayer, 'spectatorid');

    await scaffolding.ctx.gameLoader.add(game);

    player.process({type: 'or', index: 1, response: {type: 'projectCard', card: CardName.POWER_PLANT_STANDARD_PROJECT, payment: Payment.of({megacredits: 11})}});
    const options = cast(player.getWaitingFor(), OrOptions);
    options.options.push(new UndoActionOption());
    scaffolding.ctx.gameLoader.restoreGameAt = (_gameId: string, _lastSaveId: number) => Promise.resolve(undo);

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: options.options.length - 1, response: {type: 'option'}};
      req.emitString(JSON.stringify(orOptionsResponse));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    const model = JSON.parse(res.content);
    expect(game.gameAge).not.eq(undo.gameAge);
    expect(model.game.gameAge).eq(undo.gameAge);
  });

  it('performs undo when expected save id was skipped', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = '/player/input?id=' + player.id;
    const game = Game.newInstance('gameid-skipped-save-undo', [player], player, 'spectatorid');
    game.lastSaveId = 4;
    player.setWaitingFor(new OrOptions(new UndoActionOption()));

    const undoVersionOfPlayer = TestPlayer.BLUE.newPlayer({beginner: true});
    const undo = Game.newInstance('gameid-skipped-save-undo', [undoVersionOfPlayer], undoVersionOfPlayer, 'spectatorid');
    let previewSaveId: number | undefined;
    let restoredSaveId: number | undefined;

    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.ctx.gameLoader.getGameAtOrBefore = (_gameId: string, saveId: number) => {
      previewSaveId = saveId;
      return Promise.resolve(undo);
    };
    scaffolding.ctx.gameLoader.restoreGameAt = (_gameId: string, saveId: number) => {
      restoredSaveId = saveId;
      return Promise.resolve(undo);
    };

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: 0, response: {type: 'option'}};
      req.emitString(JSON.stringify(orOptionsResponse));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    const model = JSON.parse(res.content);
    expect(previewSaveId).eq(2);
    expect(restoredSaveId).eq(2);
    expect(model.game.gameAge).eq(undo.gameAge);
  });

  it('requires confirmation before undoing revealed hidden information', async () => {
    const captures: Array<CapturedError> = [];
    const handler = new PlayerInput((error, context) => captures.push({error, context}));
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = '/player/input?id=' + player.id;
    const game = Game.newInstance('gameid-hidden-undo', [player], player, 'spectatorid');
    game.lastSaveId = 4;
    game.projectDeck.draw(game);
    player.setWaitingFor(new OrOptions(new UndoActionOption()));

    const undoVersionOfPlayer = TestPlayer.BLUE.newPlayer({beginner: true});
    const undo = Game.newInstance('gameid-hidden-undo', [undoVersionOfPlayer], undoVersionOfPlayer, 'spectatorid');
    let restoreCalled = false;

    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.ctx.gameLoader.getGameAtOrBefore = (_gameId: string, _lastSaveId: number) => Promise.resolve(undo);
    scaffolding.ctx.gameLoader.restoreGameAt = (_gameId: string, _lastSaveId: number) => {
      restoreCalled = true;
      return Promise.resolve(undo);
    };

    const post = scaffolding.post(handler, res);
    const emit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: 0, response: {type: 'option'}};
      req.emitString(JSON.stringify(orOptionsResponse));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    const response = JSON.parse(res.content);
    expect(res.statusCode).eq(400);
    expect(response.id).eq('#undo-revealed-hidden-information');
    expect(response.message).eq(HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED);
    expect(restoreCalled).eq(false);

    const confirmedReq = new MockRequest();
    const confirmedRes = new MockResponse();
    const confirmedScaffolding = new RouteTestScaffolding(confirmedReq);
    confirmedScaffolding.ctx.gameLoader = scaffolding.ctx.gameLoader;
    confirmedScaffolding.url = '/player/input?id=' + player.id + '&confirmHiddenInformation=true';
    const confirmedPost = confirmedScaffolding.post(handler, confirmedRes);
    const confirmedEmit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: 0, response: {type: 'option'}};
      confirmedReq.emitString(JSON.stringify(orOptionsResponse));
      confirmedReq.emitter.emit('end');
    });
    await Promise.all([confirmedEmit, confirmedPost]);

    expect(confirmedRes.statusCode).eq(200);
    expect(restoreCalled).eq(true);
    const warningLog = undo.gameLog[undo.gameLog.length - 1];
    expect(warningLog.type).eq(LogMessageType.IRREVERSIBLE_UNDO);
    expect(captures).deep.eq([]);
  });

  it('records an accepted root input in the experimental replay journal', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoOption: true, undoStepOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.preludeCardsInHand.push(new ProjectEden());
    player.cardsInHand.push(new ArcticAlgae(), new BiomassCombustors(), new Comet());
    player.takeAction(false);
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = '/player/input?id=' + player.id;

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      req.emitString(JSON.stringify({type: 'card', cards: [CardName.PROJECT_EDEN]}));
      req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(res.statusCode).eq(200);
    expect(game.actionReplayState?.entries).length(1);
    expect(game.actionReplayState?.entries[0].input).deep.eq({type: 'card', cards: [CardName.PROJECT_EDEN]});
    expect(player.getWaitingFor()?.toModel(player).type).eq('or');
  });

  it('keeps the final Hi-Tech Lab selection replayable after the action saves', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoOption: true, undoStepOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.energy = 3;
    player.playedCards.push(new HiTechLab());
    player.takeAction(false);
    await scaffolding.ctx.gameLoader.add(game);

    const postInput = async (input: unknown) => {
      const localReq = new MockRequest();
      const localRes = new MockResponse();
      const localScaffolding = new RouteTestScaffolding(localReq);
      localScaffolding.ctx.gameLoader = scaffolding.ctx.gameLoader;
      localScaffolding.url = '/player/input?id=' + player.id;
      const post = localScaffolding.post(PlayerInput.INSTANCE, localRes);
      const emit = Promise.resolve().then(() => {
        localReq.emitString(JSON.stringify(input));
        localReq.emitter.emit('end');
      });
      await Promise.all([emit, post]);
      expect(localRes.statusCode).eq(200, localRes.content);
      return JSON.parse(localRes.content);
    };

    const rootPrompt = player.getWaitingFor()?.toModel(player);
    const actionCardIndex = rootPrompt?.type === 'or' ?
      rootPrompt.options.findIndex((option) => option.title === 'Perform an action from a played card') : -1;
    expect(actionCardIndex).gte(0);
    await postInput({
      type: 'or',
      index: actionCardIndex,
      response: {type: 'card', cards: [CardName.HI_TECH_LAB]},
    });
    await postInput({type: 'amount', amount: 3});
    const revealedPrompt = player.getWaitingFor()?.toModel(player);
    if (revealedPrompt?.type !== 'card') {
      throw new Error('Expected revealed-card choice');
    }
    const selectedCard = revealedPrompt.cards[0].name;
    const response = await postInput({type: 'card', cards: [selectedCard]});

    expect(response.canStepBack).is.true;
    expect(game.actionReplayState?.entries).length(3);
    expect(game.actionReplayState?.resetBeforeNextInput).is.true;
  });

  it('rejects undo if restore fails', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = '/player/input?id=' + player.id;
    const game = Game.newInstance('gameid-foo', [player], player, 'spectatorid');

    await scaffolding.ctx.gameLoader.add(game);

    player.process(<OrOptionsResponse>{type: 'or', index: 1, response: {type: 'projectCard', card: CardName.POWER_PLANT_STANDARD_PROJECT, payment: Payment.of({megacredits: 11})}});
    const options = cast(player.getWaitingFor(), OrOptions);
    options.options.push(new UndoActionOption());
    scaffolding.ctx.gameLoader.restoreGameAt = (_gameId: string, _lastSaveId: number) => Promise.reject(new Error('error'));

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: options.options.length - 1, response: {type: 'option'}};
      scaffolding.req.emitString(JSON.stringify(orOptionsResponse));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    const response = JSON.parse(res.content);
    expect(res.statusCode).eq(400);
    expect(response.message).eq('Unable to perform undo operation. Error retrieving game from database. Please try again.');
  });

  it('captures the original unexpected undo failure with the parsed input snapshot', async () => {
    const captures: Array<CapturedError> = [];
    const handler = new PlayerInput((error, context) => captures.push({error, context}));
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    const game = Game.newInstance('gameid-player-undo', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    player.process(<OrOptionsResponse>{type: 'or', index: 1, response: {type: 'projectCard', card: CardName.POWER_PLANT_STANDARD_PROJECT, payment: Payment.of({megacredits: 11})}});
    const options = cast(player.getWaitingFor(), OrOptions);
    options.options.push(new UndoActionOption());
    const undoError = new Error('restore failed');
    scaffolding.ctx.gameLoader.restoreGameAt = () => Promise.reject(undoError);
    const payload = {
      type: 'or',
      index: options.options.length - 1,
      response: {type: 'option'},
      debug: {authorization: 'Bearer route-secret'},
    } as unknown as OrOptionsResponse;

    const post = scaffolding.post(handler, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString(JSON.stringify(payload));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(captures).deep.eq([{
      error: undoError,
      context: {
        boundary: 'player-undo',
        method: 'POST',
        route: '/player/input',
        gameId: game.id,
        playerId: player.id,
        gameplayInput: payload,
      },
    }]);
    expect(JSON.parse(res.content).message).eq('Unable to perform undo operation. Error retrieving game from database. Please try again.');
  });

  it('does not capture an expected InputError created inside undo', async () => {
    const captures: Array<CapturedError> = [];
    const handler = new PlayerInput((error, context) => captures.push({error, context}));
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    const game = Game.newInstance('gameid-player-undo-expected', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    player.process(<OrOptionsResponse>{type: 'or', index: 1, response: {type: 'projectCard', card: CardName.POWER_PLANT_STANDARD_PROJECT, payment: Payment.of({megacredits: 11})}});
    const options = cast(player.getWaitingFor(), OrOptions);
    options.options.push(new UndoActionOption());
    scaffolding.ctx.gameLoader.restoreGameAt = () => Promise.resolve(undefined as unknown as Game);
    const payload: OrOptionsResponse = {
      type: 'or',
      index: options.options.length - 1,
      response: {type: 'option'},
    };

    const post = scaffolding.post(handler, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString(JSON.stringify(payload));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(captures).deep.eq([]);
    expect(JSON.parse(res.content).message).eq('Unable to perform undo operation. Error retrieving game from database. Please try again.');
  });

  it('captures an unexpected main input failure with a detached parsed snapshot', async () => {
    const captures: Array<CapturedError> = [];
    const handler = new PlayerInput((error, context) => captures.push({error, context}));
    const player = TestPlayer.BLUE.newPlayer();
    scaffolding.url = `/player/input?id=${player.id}&private=query-secret`;
    scaffolding.req.method = 'post';
    const game = Game.newInstance('gameid-player-input', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    const processError = new Error('process failed');
    player.process = (entity) => {
      const diagnosticProbe = entity as unknown as {debug: {card: string}, runId?: string};
      expect(diagnosticProbe).not.have.property('runId');
      diagnosticProbe.debug.card = 'mutated-after-parse';
      throw processError;
    };
    const payload = {type: 'option', runId, debug: {card: 'original-card'}};

    const post = scaffolding.post(handler, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString(JSON.stringify(payload));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(captures).deep.eq([{
      error: processError,
      context: {
        boundary: 'player-input',
        method: 'POST',
        route: '/player/input',
        gameId: game.id,
        playerId: player.id,
        gameplayInput: payload,
      },
    }]);
    expect(JSON.parse(res.content).message).eq(processError.message);
    expect(JSON.stringify(captures)).not.contains('query-secret');
  });

  it('does not capture malformed JSON or expected application errors', async () => {
    const captures: Array<CapturedError> = [];
    const handler = new PlayerInput((error, context) => captures.push({error, context}));
    const player = TestPlayer.BLUE.newPlayer();
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    const game = Game.newInstance('gameid-player-expected', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    const malformedPost = scaffolding.post(handler, res);
    const malformedEmit = Promise.resolve().then(() => {
      scaffolding.req.emitString('}{');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([malformedEmit, malformedPost]);

    expect(captures).deep.eq([]);

    const invalidRunReq = new MockRequest();
    const invalidRunRes = new MockResponse();
    const invalidRunScaffolding = new RouteTestScaffolding(invalidRunReq);
    invalidRunScaffolding.url = `/player/input?id=${player.id}`;
    invalidRunReq.method = 'POST';
    await invalidRunScaffolding.ctx.gameLoader.add(game);
    const invalidRunPost = invalidRunScaffolding.post(handler, invalidRunRes);
    const invalidRunEmit = Promise.resolve().then(() => {
      invalidRunReq.emitString(JSON.stringify({type: 'option', runId: `${runId}-stale`}));
      invalidRunReq.emitter.emit('end');
    });
    await Promise.all([invalidRunEmit, invalidRunPost]);

    expect(invalidRunRes.statusCode).eq(400);
    expect(JSON.parse(invalidRunRes.content)).deep.eq({
      id: INVALID_RUN_ID,
      message: 'The server has restarted. Click OK to refresh this page.',
    });
    expect(captures).deep.eq([]);

    for (const expected of [
      {error: new AppError(INVALID_RUN_ID, 'expected app error'), id: INVALID_RUN_ID},
      {error: new InputError('expected input error'), id: undefined},
    ]) {
      const expectedReq = new MockRequest();
      const expectedRes = new MockResponse();
      const expectedScaffolding = new RouteTestScaffolding(expectedReq);
      expectedScaffolding.url = `/player/input?id=${player.id}`;
      expectedReq.method = 'POST';
      await expectedScaffolding.ctx.gameLoader.add(game);
      player.process = () => {
        throw expected.error;
      };
      const expectedPost = expectedScaffolding.post(handler, expectedRes);
      const expectedEmit = Promise.resolve().then(() => {
        expectedReq.emitString(JSON.stringify({type: 'option'}));
        expectedReq.emitter.emit('end');
      });
      await Promise.all([expectedEmit, expectedPost]);
      expect(expectedRes.statusCode).eq(400);
      expect(JSON.parse(expectedRes.content)).deep.eq({
        ...(expected.id === undefined ? {} : {id: expected.id}),
        message: expected.error.message,
      });
    }

    expect(captures).deep.eq([]);
  });

  it('sends 400 when input processing throws a plain Error', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = '/player/input?id=' + player.id;
    const game = Game.newInstance('gameid-foo', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    const options = cast(player.getWaitingFor(), OrOptions);
    options.options.push(new SelectOption('Throw').andThen(() => {
      throw new Error('You cannot overspend heat');
    }));

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: options.options.length - 1, response: {type: 'option'}};
      req.emitString(JSON.stringify(orOptionsResponse));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.badRequest);
    expect(JSON.parse(res.content)).deep.eq({message: 'You cannot overspend heat'});
  });

  it('sends 400 on server error', async () => {
    const player = TestPlayer.BLUE.newPlayer();
    scaffolding.url = `/player/input?id=${player.id}`;
    const game = Game.newInstance('gameid', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString('}{');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).matches(/Unexpected token/);
  });

  it('waits for game save before responding', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = `/player/input?id=${player.id}`;
    const game = Game.newInstance('gameid-save', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    player.process = () => {
      game.save();
    };

    scaffolding.ctx.gameLoader.saveGame = async (savedGame: Game) => {
      await Promise.resolve();
      savedGame.lastSaveId++;
    };

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString(JSON.stringify({type: 'option'}));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    const model = JSON.parse(res.content);
    expect(model.game.step).eq(1);
  });

  it('audits accepted player input without raw payload', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLUE.newPlayer();
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    scaffolding.req.headers['user-agent'] = 'Browser A';
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    const game = Game.newInstance('gameid-audit-accepted', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    player.process = () => {};

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString('{"type":"option","debug":"secret-card-name"}');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(auditEvents).deep.eq([
      {
        event: 'player_input_attempt',
        method: 'POST',
        path: 'player/input',
        gameId: game.id,
        participantId: player.id,
        participantKind: 'player',
        clientIp: scaffolding.ctx.clientIp,
        userAgent: 'Browser A',
      },
      {
        event: 'player_input_accepted',
        method: 'POST',
        path: 'player/input',
        gameId: game.id,
        participantId: player.id,
        participantKind: 'player',
        clientIp: scaffolding.ctx.clientIp,
        userAgent: 'Browser A',
        metadata: {inputType: 'option', isUndo: false},
      },
    ]);
    expect(JSON.stringify(auditEvents)).not.contains('secret-card-name');
  });

  it('audits surrender accepted through player input', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLUE.newPlayer();
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    const game = Game.newInstance('gameid-audit-surrender', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    player.process = () => game.surrenderedPlayerIds.add(player.id);

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString('{"type":"option"}');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(auditEvents.map((event) => event.event)).deep.eq([
      'player_input_attempt',
      'surrender_accepted',
      'player_input_accepted',
    ]);
    expect(auditEvents[1].metadata).deep.eq({authorization: 'player'});
  });

  it('commits surrender, starts a bot and audits through player input', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const [game, player] = testGame(3);
    game.generation = 1;
    game.phase = Phase.ACTION;
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    await scaffolding.ctx.gameLoader.add(game);

    player.clearWaitingFor();
    player.takeAction(false);
    const actions = cast(player.getWaitingFor(), OrOptions);
    const surrenderIndex = actions.options.findIndex((option) => option.title === 'Surrender this game and start a bot');
    expect(surrenderIndex).greaterThan(-1);
    player.process({type: 'or', index: surrenderIndex, response: {type: 'option'}});

    const {manager, starts} = newBotManager();
    const handler = new PlayerInput(manager);
    const post = scaffolding.post(handler, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString('{"type":"or","index":0,"response":{"type":"option"}}');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(res.statusCode).eq(200);
    expect(game.surrenderedPlayerIds.has(player.id)).eq(true);
    expect(game.botPlayerIds.has(player.id)).eq(false);
    expect(game.hasPassedThisActionPhase(player)).eq(false);
    expect(starts).deep.eq([{compatibility: {version: 1, unsupportedFeatures: []}, gameId: game.id, playerId: player.id, serverId: scaffolding.ctx.ids.serverId}]);
    expect(JSON.parse(res.content).waitingFor.title).eq('Take your next action');
    expect(auditEvents.map((event) => event.event)).deep.eq([
      'player_input_attempt',
      'surrender_accepted',
      'player_input_accepted',
    ]);
    expect(auditEvents[1].metadata).deep.eq({authorization: 'player', botTakeover: 'started'});
  });

  it('rejects surrendered-seat input without the bot server capability', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const [game, player] = testGame(2);
    game.surrenderedPlayerIds.add(player.id);
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    await scaffolding.ctx.gameLoader.add(game);

    let processed = 0;
    player.process = () => {
      processed++;
    };

    await scaffolding.post(PlayerInput.INSTANCE, res);

    expect(res.statusCode).eq(400);
    expect(res.content).eq('Bad request: surrendered player is controlled by a bot');
    expect(processed).eq(0);
    expect(auditEvents.map((event) => event.event)).deep.eq([
      'player_input_attempt',
      'player_input_rejected',
    ]);
    expect(auditEvents[1].metadata).deep.eq({reason: 'surrendered_bot_control'});

    const botResponse = new MockResponse();
    scaffolding.url = `/player/input?id=${player.id}&serverId=${scaffolding.ctx.ids.serverId}`;
    const post = scaffolding.post(PlayerInput.INSTANCE, botResponse);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString('{"type":"option"}');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(botResponse.statusCode).eq(200);
    expect(processed).eq(1);
  });

  it('rolls surrender back when the bot cannot start', async () => {
    const [game, player] = testGame(3);
    game.generation = 1;
    game.phase = Phase.ACTION;
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    await scaffolding.ctx.gameLoader.add(game);

    player.clearWaitingFor();
    player.takeAction(false);
    const actions = cast(player.getWaitingFor(), OrOptions);
    const surrenderIndex = actions.options.findIndex((option) => option.title === 'Surrender this game and start a bot');
    player.process({type: 'or', index: surrenderIndex, response: {type: 'option'}});

    const {manager} = newBotManager({startError: new Error('spawn failed')});
    const handler = new PlayerInput(manager);
    const post = scaffolding.post(handler, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString('{"type":"or","index":0,"response":{"type":"option"}}');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    const restored = await scaffolding.ctx.gameLoader.getGame(game.id);
    expect(res.statusCode).eq(400);
    expect(JSON.parse(res.content).message).contains('Unable to surrender');
    expect(restored?.surrenderedPlayerIds.has(player.id)).eq(false);
    expect(restored?.getPlayerById(player.id).getWaitingFor()).is.not.undefined;
  });

  it('audits rejected player input without raw payload', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const player = TestPlayer.BLUE.newPlayer();
    scaffolding.url = `/player/input?id=${player.id}`;
    scaffolding.req.method = 'POST';
    scaffolding.req.headers['user-agent'] = 'Browser A';
    scaffolding.ctx.clientIp = {address: '203.0.113.10', source: 'cf-connecting-ip'};
    scaffolding.ctx.accessAudit = {record: (event) => auditEvents.push(event)};
    const game = Game.newInstance('gameid-audit-rejected', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString('{"type":"option","debug":"secret-card-name"');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(res.statusCode).eq(400);
    expect(auditEvents).deep.eq([
      {
        event: 'player_input_attempt',
        method: 'POST',
        path: 'player/input',
        gameId: game.id,
        participantId: player.id,
        participantKind: 'player',
        clientIp: scaffolding.ctx.clientIp,
        userAgent: 'Browser A',
      },
      {
        event: 'player_input_rejected',
        method: 'POST',
        path: 'player/input',
        gameId: game.id,
        participantId: player.id,
        participantKind: 'player',
        clientIp: scaffolding.ctx.clientIp,
        userAgent: 'Browser A',
        metadata: {inputType: null, isUndo: false, errorId: null},
      },
    ]);
    expect(JSON.stringify(auditEvents)).not.contains('secret-card-name');
  });

  it('writes exact player input payload to the shadow log when enabled', async () => {
    shadowLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-shadow-input-'));
    process.env.SHADOW_LOG = '1';
    process.env.SHADOW_LOG_DIR = shadowLogDir;
    process.env.SHADOW_LOG_FILE_PREFIX = 'input';

    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = `/player/input?id=${player.id}`;
    const game = Game.newInstance('gameid-log', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    player.process = () => {};

    const payload = {type: 'option'};
    const rawBody = JSON.stringify(payload);
    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString(rawBody);
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    const logFile = path.join(shadowLogDir, `input-${game.id}.jsonl`);
    expect(fs.existsSync(logFile)).eq(true);

    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    expect(lines).has.length(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.source).eq('player-input');
    expect(entry.result).eq('accepted');
    expect(entry.playerId).eq(player.id);
    expect(entry.gameId).eq(game.id);
    expect(entry.promptInputSeq).eq(0);
    expect(entry.inputSeq).eq(1);
    expect(entry.inputType).eq('option');
    expect(entry.isUndo).eq(false);
    expect(entry.rawBody).eq(rawBody);
    expect(entry.playerAction).deep.eq(payload);
    expect(entry.promptType).to.not.eq(null);

    const model = JSON.parse(res.content);
    expect(model.game.inputSeq).eq(1);
  });

  it('journals the offered draft before processing changes the pack', async () => {
    shadowLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-shadow-draft-'));
    process.env.SHADOW_LOG = '1';
    process.env.SHADOW_LOG_DIR = shadowLogDir;
    const [game, player] = testGame(3);
    scaffolding.url = `/player/input?id=${player.id}`;
    await scaffolding.ctx.gameLoader.add(game);
    game.phase = Phase.DRAFTING;
    const pack = [new Sponsors(), new PowerPlant()];
    player.setWaitingFor(new SelectCard('Select a card to keep', 'Select', pack), () => undefined);
    player.process = () => {
      pack.splice(0, pack.length);
      player.popWaitingFor();
      game.phase = Phase.ACTION;
    };
    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString(JSON.stringify({type: 'card', cards: [CardName.SPONSORS]}));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);
    const entry = JSON.parse(fs.readFileSync(path.join(shadowLogDir, `input-${game.id}.jsonl`), 'utf8'));
    expect(entry.schemaVersion).eq('server-decision/v2');
    expect(entry.decisionState.game.phase).eq('drafting');
    expect(entry.decisionState.game.inputSeq).eq(0);
    expect(entry.decisionState.waitingFor.cards.map((c: {name: string}) => c.name)).deep.eq(['Sponsors', 'Power Plant']);
    expect(entry.playerAction.cards).deep.eq(['Sponsors']);
    expect(entry.phaseAfter).eq('action');
    expect(entry.decisionState.players).has.length(3);
    expect(entry.decisionState.runId).eq(undefined);
  });


  it('rejects a response to an earlier input', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = `/player/input?id=${player.id}`;
    const game = Game.newInstance('gameid', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    const waitingFor = player.getWaitingFor();
    const powerPlant: OrOptionsResponse = {type: 'or', index: 1, response: {type: 'projectCard', card: CardName.POWER_PLANT_STANDARD_PROJECT, payment: Payment.of({megacredits: 11})}};

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitString(JSON.stringify({requestId: 'earlier', ...powerPlant}));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    expect(res.statusCode).eq(statusCode.badRequest);
    expect(JSON.parse(res.content).id).eq(INVALID_REQUEST_ID);
    expect(player.getWaitingFor()).eq(waitingFor);
  });

  describe('response interval', () => {
    let clock: FakeClock;
    let player: TestPlayer;

    beforeEach(async () => {
      clock = scaffolding.ctx.clock as FakeClock;
      player = TestPlayer.BLUE.newPlayer({beginner: true});
      player.clock = clock;
      const game = Game.newInstance('gameid', [player], player, 'spectatorid');
      await scaffolding.ctx.gameLoader.add(game);
      playerInputMetrics.responseInterval.reset();
    });

    /**
     * POSTs `body` to `handler` as input from `playerId`, and waits for the response.
     *
     * Replaces `req` and `res` with fresh mocks, so after this returns, `res` holds this request's response.
     */
    async function send(handler: PlayerInput, playerId: string, body: string): Promise<void> {
      req = new MockRequest();
      res = new MockResponse();
      scaffolding.req = req;
      scaffolding.url = `/player/input?id=${playerId}`;
      const post = scaffolding.post(handler, res);
      const emit = Promise.resolve().then(() => {
        req.emitString(body);
        req.emitter.emit('end');
      });
      await Promise.all([emit, post]);
    }

    it('rejects input sent before the interval elapses', async () => {
      const handler = new PlayerInput(1000);
      player.inputRequestedAt = 5000;
      clock.millis = 5999;

      await send(handler, player.id, '}{');
      expect(res.statusCode).eq(statusCode.badRequest);
      expect(JSON.parse(res.content).id).eq(RESPONDING_TOO_QUICKLY);
    });

    it('a rejected input does not restart the interval', async () => {
      const handler = new PlayerInput(1000);
      player.inputRequestedAt = 5000;
      clock.millis = 5999;

      await send(handler, player.id, '}{');
      expect(JSON.parse(res.content).id).eq(RESPONDING_TOO_QUICKLY);

      clock.millis = 6000;
      await send(handler, player.id, '}{');
      expect(res.statusCode).eq(statusCode.badRequest);
      expect(JSON.parse(res.content).id).is.undefined;
    });

    it('processing an input restarts the interval', async () => {
      const handler = new PlayerInput(1000);
      player.inputRequestedAt = 5000;
      clock.millis = 6000;

      const response: OrOptionsResponse = {type: 'or', index: 1, response: {type: 'projectCard', card: CardName.POWER_PLANT_STANDARD_PROJECT, payment: Payment.of({megacredits: 11})}};
      await send(handler, player.id, JSON.stringify(response));
      expect(res.statusCode).eq(statusCode.ok);

      clock.millis = 6999;

      await send(handler, player.id, '}{');
      expect(res.statusCode).eq(statusCode.badRequest);
      expect(JSON.parse(res.content).id).eq(RESPONDING_TOO_QUICKLY);
    });

    it('does not limit input when the response interval is zero', async () => {
      const handler = new PlayerInput(0);

      await send(handler, player.id, '}{');
      expect(res.statusCode).eq(statusCode.badRequest);
      expect(JSON.parse(res.content).id).is.undefined;
    });

    it('records the time taken to respond to an input request', async () => {
      const handler = new PlayerInput(0);
      player.inputRequestedAt = 5000;
      clock.millis = 5300;

      await send(handler, player.id, '}{');

      const values = (await playerInputMetrics.responseInterval.get()).values;
      expect(values.find((v) => v.metricName === 'player_input_response_interval_count')?.value).eq(1);
      expect(values.find((v) => v.metricName === 'player_input_response_interval_sum')?.value).eq(300);
    });
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
