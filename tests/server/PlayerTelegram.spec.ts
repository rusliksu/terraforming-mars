import {expect} from 'chai';
import {Game} from '../../src/server/Game';
import {Player} from '../../src/server/Player';

describe('Player telegram state', () => {
  it('preserves notice state across game serialization', () => {
    const player1 = new Player('Руслан', 'red', false, 0, 'p-ruslan');
    const player2 = new Player('Паша', 'blue', false, 0, 'p-pasha');
    const game = Game.newInstance('g-telegram', [player1, player2], player1);

    player1.telegramID = '123456';
    player1.lastNoticeMessageId = 77;
    player1.lastTurnNoticeKey = 'g-telegram:1:action:p-ruslan:0';

    const restored = Game.deserialize(game.serialize());
    const restoredPlayer = restored.getPlayerById(player1.id) as Player;

    expect(restoredPlayer.telegramID).eq('123456');
    expect(restoredPlayer.lastNoticeMessageId).eq(77);
    expect(restoredPlayer.lastTurnNoticeKey).eq('g-telegram:1:action:p-ruslan:0');
  });
});
