import {expect} from 'chai';
import {ApiGameLogs} from '../../src/server/routes/ApiGameLogs';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {LogMessageDataType} from '../../src/common/logs/LogMessageDataType';
import {CardName} from '../../src/common/cards/CardName';
import {Phase} from '../../src/common/Phase';
import {testGame} from '@tests/TestGame';
import {statusCode} from '@/common/http/statusCode';
use(chaiAsPromised);

describe('ApiGameLogs', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  it('fails when id not provided', async () => {
    scaffolding.url = '/api/game/logs';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: missing id parameter');
  });

  it('fails with invalid id', async () => {
    scaffolding.url = '/api/game/logs?id=game-id';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.badRequest);
    expect(res.content).eq('Bad request: invalid participant id');
  });

  it('fails when game not found', async () => {
    scaffolding.url = '/api/game/logs?id=player-invalid-id';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found: game not found');
  });

  it('pulls logs when no generation provided', async () => {
    const [game, player] = testGame(1);
    scaffolding.url = '/api/game/logs?id=' + player.id;
    await scaffolding.ctx.gameLoader.add(game);
    game.log('Generation ${0}', (b) => b.forNewGeneration().number(50));
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);
    expect(messages.length).gt(1);
    expect(messages[messages.length - 1].message).eq('Generation ${0}');
    expect(messages[messages.length - 1].data[0].value).eq('50');
  });

  it('pulls logs for most recent generation', async () => {
    const [game, player] = testGame(1);
    scaffolding.url = '/api/game/logs?id=' + player.id + '&generation=50';
    await scaffolding.ctx.gameLoader.add(game);
    game.log('Generation ${0}', (b) => b.forNewGeneration().number(50));
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);
    expect(messages).has.length(1);
    expect(messages[messages.length - 1].message).eq('Generation ${0}');
    expect(messages[messages.length - 1].data[0].value).eq('50');
  });

  it('pulls full current generation when explicitly requested', async () => {
    const [game, player] = testGame(1);
    await scaffolding.ctx.gameLoader.add(game);

    game.gameLog.length = 0;
    game.log('Generation ${0}', (b) => b.forNewGeneration().number(1));
    for (let i = 0; i < 60; i++) {
      game.log(`Log ${i}`);
    }

    scaffolding.url = '/api/game/logs?id=' + player.id + '&generation=1';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);

    expect(messages).has.length(61);
    expect(messages[0].message).eq('Generation ${0}');
    expect(messages[messages.length - 1].message).eq('Log 59');
  });

  it('pulls the most recent 100 logs when requested', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    game.gameLog.length = 0;
    for (let i = 0; i < 120; i++) {
      game.log(`Log ${i}`);
    }

    scaffolding.url = '/api/game/logs?id=' + player.id + '&limit=100';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);

    expect(messages).has.length(100);
    expect(messages[0].message).eq('Log 20');
    expect(messages[messages.length - 1].message).eq('Log 119');
  });

  it('pulls logs for first generation', async () => {
    const [game, player] = testGame(1);
    scaffolding.url = '/api/game/logs?id=' + player.id;
    await scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);
    expect(messages.length).gt(1);
    expect(messages[messages.length - 1].message).eq('Generation ${0}');
    expect(messages[messages.length - 1].data[0].value).eq('1');
  });

  it('pulls logs for missing generation', async () => {
    const [game, player] = testGame(1);
    scaffolding.url = '/api/game/logs?id=' + player.id + '&generation=2';
    await scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);
    expect(messages).is.empty;
  });

  it('does not use canceled generation messages as generation boundaries', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);

    game.gameLog.length = 0;
    game.log('Generation ${0}', (b) => b.forNewGeneration().number(1));
    game.log('Gen 1 before undo');
    game.log('Generation ${0}', (b) => b.forNewGeneration().number(2));
    game.gameLog[2].canceled = true;
    game.log('Gen 1 after undo');
    game.log('Generation ${0}', (b) => b.forNewGeneration().number(2));
    game.log('Gen 2 real');

    scaffolding.url = '/api/game/logs?id=' + player.id + '&generation=1';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);

    expect(messages.map((message: {message: string}) => message.message)).deep.eq([
      'Generation ${0}',
      'Gen 1 before undo',
      'Generation ${0}',
      'Gen 1 after undo',
    ]);
    expect(messages[2].canceled).eq(true);
  });

  [{idx: 0, color: 'Yellow'}, {idx: 1, color: 'Orange'}, {idx: 2, color: 'Blue'}].forEach((entry) => {
    it('omits private logs for other players: ' + entry.color, async () => {
      const yellowPlayer = TestPlayer.YELLOW.newPlayer();
      const orangePlayer = TestPlayer.ORANGE.newPlayer();
      const bluePlayer = TestPlayer.BLUE.newPlayer();

      const players = [yellowPlayer, orangePlayer, bluePlayer];
      const playerUnderTest = players[entry.idx];

      const game = Game.newInstance('game-id', players, yellowPlayer, 'spectatorid');
      await scaffolding.ctx.gameLoader.add(game);

      // Remove logs to-date to simplify the test
      game.gameLog.length = 0;
      game.log('All players see this.');
      game.log('Yellow player sees this.', (_b) => {}, {reservedFor: yellowPlayer});
      game.log('Orange player sees this.', (_b) => {}, {reservedFor: orangePlayer});
      game.log('Blue player sees this.', (_b) => {}, {reservedFor: bluePlayer});

      scaffolding.url = '/api/game/logs?id=' + playerUnderTest.id;
      await scaffolding.get(ApiGameLogs.INSTANCE, res);
      const messages = JSON.parse(res.content);

      expect(messages).has.length(2);
      expect(messages[0].message).eq('All players see this.');
      expect(messages[1].message).eq(`${entry.color} player sees this.`);
    });
  });

  it('includes private logs for all players when a finished game is viewed as spectator', async () => {
    const yellowPlayer = TestPlayer.YELLOW.newPlayer();
    const orangePlayer = TestPlayer.ORANGE.newPlayer();
    const spectatorId = 's-spectatorid' as any;
    const game = Game.newInstance('game-id', [yellowPlayer, orangePlayer], yellowPlayer, spectatorId);
    game.phase = Phase.END;
    await scaffolding.ctx.gameLoader.add(game);

    game.gameLog.length = 0;
    game.log('All players see this.');
    game.log('Yellow player sees this.', (_b) => {}, {reservedFor: yellowPlayer});
    game.log('Orange player sees this.', (_b) => {}, {reservedFor: orangePlayer});

    scaffolding.url = '/api/game/logs?id=' + spectatorId + '&generation=1';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);

    expect(messages.map((message: {message: string}) => message.message)).deep.eq([
      'All players see this.',
      'Yellow player sees this.',
      'Orange player sees this.',
    ]);
  });

  it('hides private logs from spectator during active games even when spectator hands are not private', async () => {
    const yellowPlayer = TestPlayer.YELLOW.newPlayer();
    const orangePlayer = TestPlayer.ORANGE.newPlayer();
    const spectatorId = 's-spectatorid' as any;
    const game = Game.newInstance('game-id', [yellowPlayer, orangePlayer], yellowPlayer, spectatorId, {privateHands: false});
    await scaffolding.ctx.gameLoader.add(game);

    game.gameLog.length = 0;
    game.log('All players see this.');
    game.log('Yellow player sees this.', (_b) => {}, {reservedFor: yellowPlayer});
    game.log('Orange player sees this.', (_b) => {}, {reservedFor: orangePlayer});

    scaffolding.url = '/api/game/logs?id=' + spectatorId + '&generation=1';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);

    expect(messages.map((message: {message: string}) => message.message)).deep.eq([
      'All players see this.',
    ]);
  });

  it('labels game-end spectator-visible private logs with the owning player', async () => {
    const yellowPlayer = TestPlayer.YELLOW.newPlayer();
    const orangePlayer = TestPlayer.ORANGE.newPlayer();
    const spectatorId = 's-spectatorid' as any;
    const game = Game.newInstance('game-id', [yellowPlayer, orangePlayer], yellowPlayer, spectatorId, {privateHands: false});
    game.phase = Phase.END;
    await scaffolding.ctx.gameLoader.add(game);

    game.gameLog.length = 0;
    game.log('You drafted ${0} passing ${1} to ${2}', (b) => b
      .cards([CardName.ALGAE])
      .cards([CardName.ANTS])
      .player(orangePlayer), {reservedFor: yellowPlayer});
    game.log('${0} drew ${1}', (b) => b
      .string('You')
      .cards([CardName.BIRDS]), {reservedFor: orangePlayer});

    scaffolding.url = '/api/game/logs?id=' + spectatorId + '&generation=1';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    const messages = JSON.parse(res.content);

    expect(messages[0].message).eq('${0} drafted ${1} passing ${2} to ${3}');
    expect(messages[0].data[0]).deep.eq({type: LogMessageDataType.PLAYER, value: yellowPlayer.color});
    expect(messages[1].message).eq('${0} drew ${1}');
    expect(messages[1].data[0]).deep.eq({type: LogMessageDataType.PLAYER, value: orangePlayer.color});
  });

  it('Cannot pull full logs before game end', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    scaffolding.url = '/api/game/logs?id=' + player.id + '&full';
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    await scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    expect(res.content).eq('Bad request: cannot fetch game-end log');
  });

  it('Pulls full logs at game end', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const player2 = TestPlayer.BLUE.newPlayer();
    scaffolding.url = '/api/game/logs?id=' + player.id + '&full';
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid');
    game.phase = Phase.END;
    await scaffolding.ctx.gameLoader.add(game);
    await scaffolding.get(ApiGameLogs.INSTANCE, res);
    expect(res.content).to.match(/^First player this generation is player-black/);
  });

  it('omits canceled entries from the downloadable game-end log', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectatorid');
    game.phase = Phase.END;
    game.gameLog.length = 0;
    game.log('Kept entry');
    game.log('Canceled entry');
    game.gameLog[1].canceled = true;
    await scaffolding.ctx.gameLoader.add(game);

    scaffolding.url = '/api/game/logs?id=' + player.id + '&full';
    await scaffolding.get(ApiGameLogs.INSTANCE, res);

    expect(res.content).eq('Kept entry');
  });
});
