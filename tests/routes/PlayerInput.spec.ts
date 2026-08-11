import {expect} from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {PlayerInput} from '../../src/server/routes/PlayerInput';
import {MockRequest, MockResponse} from './HttpMocks';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {UndoActionOption} from '../../src/server/inputs/UndoActionOption';
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

describe('PlayerInput', () => {
  let scaffolding: RouteTestScaffolding;
  let req: MockRequest;
  let res: MockResponse;
  let shadowLogDir: string | undefined;
  const originalShadowLog = process.env.SHADOW_LOG;
  const originalShadowLogDir = process.env.SHADOW_LOG_DIR;
  const originalShadowLogFilePrefix = process.env.SHADOW_LOG_FILE_PREFIX;

  beforeEach(() => {
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
    if (shadowLogDir !== undefined) {
      fs.rmSync(shadowLogDir, {recursive: true, force: true});
      shadowLogDir = undefined;
    }
  });

  it('fails when id not provided', async () => {
    scaffolding.url = '/player/input';
    await scaffolding.post(PlayerInput.INSTANCE, res);
    expect(res.content).eq('Bad request: missing id parameter');
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
      req.emitter.emit('data', JSON.stringify(orOptionsResponse));
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
      req.emitter.emit('data', JSON.stringify(orOptionsResponse));
      req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    const model = JSON.parse(res.content);
    expect(previewSaveId).eq(2);
    expect(restoredSaveId).eq(2);
    expect(model.game.gameAge).eq(undo.gameAge);
  });

  it('requires confirmation before undoing revealed hidden information', async () => {
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

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: 0, response: {type: 'option'}};
      req.emitter.emit('data', JSON.stringify(orOptionsResponse));
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
    const confirmedPost = confirmedScaffolding.post(PlayerInput.INSTANCE, confirmedRes);
    const confirmedEmit = Promise.resolve().then(() => {
      const orOptionsResponse: OrOptionsResponse = {type: 'or', index: 0, response: {type: 'option'}};
      confirmedReq.emitter.emit('data', JSON.stringify(orOptionsResponse));
      confirmedReq.emitter.emit('end');
    });
    await Promise.all([confirmedEmit, confirmedPost]);

    expect(confirmedRes.statusCode).eq(200);
    expect(restoreCalled).eq(true);
    const warningLog = undo.gameLog[undo.gameLog.length - 1];
    expect(warningLog.type).eq(LogMessageType.IRREVERSIBLE_UNDO);
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
      req.emitter.emit('data', JSON.stringify({type: 'card', cards: [CardName.PROJECT_EDEN]}));
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
        localReq.emitter.emit('data', JSON.stringify(input));
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
      scaffolding.req.emitter.emit('data', JSON.stringify(orOptionsResponse));
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

    const response = JSON.parse(res.content);
    expect(res.statusCode).eq(400);
    expect(response.message).eq('Unable to perform undo operation. Error retrieving game from database. Please try again.');
  });

  it('sends 400 on server error', async () => {
    const player = TestPlayer.BLUE.newPlayer();
    scaffolding.url = `/player/input?id=${player.id}`;
    const game = Game.newInstance('gameid', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    const post = scaffolding.post(PlayerInput.INSTANCE, res);
    const emit = Promise.resolve().then(() => {
      scaffolding.req.emitter.emit('data', '}{');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all(([emit, post]));

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
      scaffolding.req.emitter.emit('data', JSON.stringify({type: 'option'}));
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
      scaffolding.req.emitter.emit('data', '{"type":"option","debug":"secret-card-name"}');
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

  it('commits surrender, starts a bot and audits through player input', async () => {
    const auditEvents: Array<AccessAuditRecordInput> = [];
    const [game, player] = testGame(2);
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
      scaffolding.req.emitter.emit('data', '{"type":"or","index":0,"response":{"type":"option"}}');
      scaffolding.req.emitter.emit('end');
    });
    await Promise.all([emit, post]);

    expect(res.statusCode).eq(200);
    expect(game.surrenderedPlayerIds.has(player.id)).eq(true);
    expect(game.botPlayerIds.has(player.id)).eq(false);
    expect(game.hasPassedThisActionPhase(player)).eq(false);
    expect(starts).deep.eq([{gameId: game.id, playerId: player.id, serverId: scaffolding.ctx.ids.serverId}]);
    expect(JSON.parse(res.content).waitingFor.title).eq('Take your next action');
    expect(auditEvents.map((event) => event.event)).deep.eq([
      'player_input_attempt',
      'surrender_accepted',
      'player_input_accepted',
    ]);
    expect(auditEvents[1].metadata).deep.eq({authorization: 'player', botTakeover: 'started'});
  });

  it('rolls surrender back when the bot cannot start', async () => {
    const [game, player] = testGame(2);
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
      scaffolding.req.emitter.emit('data', '{"type":"or","index":0,"response":{"type":"option"}}');
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
      scaffolding.req.emitter.emit('data', '{"type":"option","debug":"secret-card-name"');
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
      scaffolding.req.emitter.emit('data', rawBody);
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
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
