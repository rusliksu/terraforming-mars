
import {expect} from 'chai';
import {Algae} from '../src/server/cards/base/Algae';
import {Ants} from '../src/server/cards/base/Ants';
import {Birds} from '../src/server/cards/base/Birds';
import {Game} from '../src/server/Game';
import {LogHelper} from '../src/server/LogHelper';
import {LogMessageDataType} from '../src/common/logs/LogMessageDataType';
import {TestPlayer} from './TestPlayer';

describe('LogHelper', () => {
  it('logs drawn cards by card', () => {
    const player1 = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const card1 = new Algae();
    const card2 = new Ants();
    const card3 = new Birds();
    const game = Game.newInstance('gameid', [player1, player2], player1);
    LogHelper.logDrawnCards(player1, []);
    let msg = game.gameLog.pop();
    expect(msg!.message).to.eq('${0} drew no cards');
    LogHelper.logDrawnCards(player1, [card1]);
    msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq(player1.color);
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name]);
    expect(msg.message).to.eq('${0} drew ${1}');
    LogHelper.logDrawnCards(player1, [card1, card2]);
    msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq(player1.color);
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name, card2.name]);
    expect(msg.message).to.eq('${0} drew ${1}');
    LogHelper.logDrawnCards(player1, [card1, card2, card3]);
    msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq(player1.color);
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name, card2.name, card3.name]);
    expect(msg.message).to.eq('${0} drew ${1}');
  });

  it('logs drawn cards by card name', () => {
    const player1 = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const card1 = new Algae();
    const card2 = new Ants();
    const card3 = new Birds();
    const game = Game.newInstance('gameid', [player1, player2], player1);
    LogHelper.logDrawnCards(player1, []);
    let msg = game.gameLog.pop();
    expect(msg!.message).to.eq('${0} drew no cards');
    LogHelper.logDrawnCards(player1, [card1.name]);
    msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq(player1.color);
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name]);
    expect(msg.message).to.eq('${0} drew ${1}');
    LogHelper.logDrawnCards(player1, [card1.name, card2.name]);
    msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq(player1.color);
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name, card2.name]);
    expect(msg.message).to.eq('${0} drew ${1}');
    LogHelper.logDrawnCards(player1, [card1.name, card2.name, card3.name]);
    msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq(player1.color);
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name, card2.name, card3.name]);
    expect(msg.message).to.eq('${0} drew ${1}');
  });

  it('logs drawn cards privately', () => {
    const player1 = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const card1 = new Algae();
    const game = Game.newInstance('gameid', [player1, player2], player1);
    LogHelper.logDrawnCards(player1, [card1.name], true);
    const msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq('You');
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name]);
    expect(msg.message).to.eq('${0} drew ${1}');
  });

  it('logs private card actions with the requested verb', () => {
    const player1 = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const card1 = new Algae();
    const game = Game.newInstance('gameid', [player1, player2], player1);
    LogHelper.logCardAction(player1, 'bought', [card1.name], true);
    const msg = game.gameLog.pop()!;
    expect(msg.data).has.length(2);
    expect(msg.data[0].value).to.eq('You');
    expect(msg.data[1].type).to.eq(LogMessageDataType.CARDS);
    expect(msg.data[1].value).to.deep.eq([card1.name]);
    expect(msg.message).to.eq('${0} bought ${1}');
  });

  it('logs private picked and skipped cards distinctly', () => {
    const player1 = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const card1 = new Algae();
    const card2 = new Ants();
    const game = Game.newInstance('gameid', [player1, player2], player1);
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
