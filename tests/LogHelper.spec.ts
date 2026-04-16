import {expect} from 'chai';
import {Algae} from '../src/server/cards/base/Algae';
import {Ants} from '../src/server/cards/base/Ants';
import {Birds} from '../src/server/cards/base/Birds';
import {Game} from '../src/server/Game';
import {LogHelper} from '../src/server/LogHelper';
import {LogMessageDataType} from '../src/common/logs/LogMessageDataType';
import {TestPlayer} from './TestPlayer';

describe('LogHelper', () => {
  function newGame() {
    const player1 = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player1, player2], player1);
    return {player1, player2, game};
  }

  it('logs no drawn cards ', () => {
    const {player1, game} = newGame();
    LogHelper.logDrawnCards(player1, []);
    const msg = game.gameLog.pop()!;
    msg.timestamp = 0;

    const expected = {
      message: '${0} drew no cards',
      data: [{type: LogMessageDataType.PLAYER, value: 'blue'}],
      playerId: undefined, timestamp: 0,
    };
    expect(msg).deep.eq(expected);
  });

  it('logs drawn cards by card name', () => {
    const {player1, game} = newGame();
    const cardNames = [new Algae().name, new Ants().name, new Birds().name] as const;
    for (const run of [
      {cards: [cardNames[0]], expected: [cardNames[0]]},
      {cards: [cardNames[0], cardNames[1]], expected: [cardNames[0], cardNames[1]]},
      {cards: [cardNames[0], cardNames[1], cardNames[2]], expected: [cardNames[0], cardNames[1], cardNames[2]]},
    ] as const) {
      LogHelper.logDrawnCards(player1, run.cards);
      const msg = game.gameLog.pop()!;
      msg.timestamp = 0;

      const expected = {
        message: '${0} drew ${1}',
        data: [
          {type: LogMessageDataType.PLAYER, value: 'blue'},
          {type: LogMessageDataType.CARDS, value: run.expected},
        ],
        playerId: undefined, timestamp: 0,
      };
      expect(msg).deep.eq(expected);
    }
  });

  it('logs drawn cards by card object', () => {
    const {player1, game} = newGame();
    for (const run of [
      {cards: [new Algae()], expected: ['Algae']},
      {cards: [new Algae(), new Ants()], expected: ['Algae', 'Ants']},
      {cards: [new Algae(), new Ants(), new Birds()], expected: ['Algae', 'Ants', 'Birds']},
    ] as const) {
      LogHelper.logDrawnCards(player1, run.cards);
      const msg = game.gameLog.pop()!;
      msg.timestamp = 0;
      expect(msg).deep.eq({
        message: '${0} drew ${1}',
        data: [
          {type: LogMessageDataType.PLAYER, value: 'blue'},
          {type: LogMessageDataType.CARDS, value: run.expected},
        ],
        playerId: undefined,
        timestamp: 0,
      });
    }
  });

  it('logs drawn cards privately', () => {
    const {player1, game} = newGame();
    const card1 = new Algae();
    LogHelper.logDrawnCards(player1, [card1], true);
    const msg = game.gameLog.pop()!;

    msg.timestamp = 0; // for testing.

    expect(msg).deep.eq({
      message: '${0} drew ${1}',
      data: [
        {type: LogMessageDataType.STRING, value: 'You'},
        {type: LogMessageDataType.CARDS, value: ['Algae']},
      ],
      timestamp: 0,
      playerId: 'p-blue-id',
    });
  });

  it('logs private card actions with the requested verb', () => {
    const {player1, game} = newGame();
    const card1 = new Algae();
    LogHelper.logCardAction(player1, 'bought', [card1.name], true);
    const msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq('You');
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name]);
    expect(msg.message).to.eq('${0} bought ${1}');
  });

  it('logs private picked and skipped cards distinctly', () => {
    const {player1, game} = newGame();
    const card1 = new Algae();
    const card2 = new Ants();
    LogHelper.logPrivateCardSelection(player1, 'bought', [card1.name], [card2.name]);
    const msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[0].value).to.deep.eq([card1.name]);
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card2.name]);
    expect(msg.message).to.eq('You bought ${0} skipping ${1}');
  });
});
