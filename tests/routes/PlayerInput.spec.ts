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

  it('blocks undo when the action revealed hidden information', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = '/player/input?id=' + player.id;
    const game = Game.newInstance('gameid-hidden-undo', [player], player, 'spectatorid');
    game.lastSaveId = 4;
    game.projectDeck.draw();
    player.setWaitingFor(new OrOptions(new UndoActionOption()));

    const undoVersionOfPlayer = TestPlayer.BLUE.newPlayer({beginner: true});
    const undo = Game.newInstance('gameid-hidden-undo', [undoVersionOfPlayer], undoVersionOfPlayer, 'spectatorid');
    let restoreCalled = false;

    await scaffolding.ctx.gameLoader.add(game);
    (scaffolding.ctx.gameLoader as any).getGameAt = (_gameId: string, _lastSaveId: number) => Promise.resolve(undo);
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
    expect(response.message).eq('Cannot undo after hidden information was revealed');
    expect(restoreCalled).eq(false);
  });

  it('reverts to current game instance if undo fails', async () => {
    const player = TestPlayer.BLUE.newPlayer({beginner: true});
    scaffolding.url = '/player/input?id=' + player.id;
    const game = Game.newInstance('gameid-foo', [player], player, 'spectatorid');

    const undoVersionOfPlayer = TestPlayer.BLUE.newPlayer({beginner: true});
    const undo = Game.newInstance('gameid-old', [undoVersionOfPlayer], undoVersionOfPlayer, 'spectatorid');

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

    const model = JSON.parse(res.content);
    expect(game.gameAge).not.eq(undo.gameAge);
    expect(model.game.gameAge).eq(model.game.gameAge);
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
