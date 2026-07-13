import {expect} from 'chai';
import {Game} from '../../../src/server/Game';
import {LogMessageType} from '../../../src/common/logs/LogMessageType';
import {recordHiddenInformationUndo} from '../../../src/server/game/hiddenInformationUndo';
import {TestPlayer} from '../../TestPlayer';

describe('recordHiddenInformationUndo', () => {
  it('keeps the audit log when persistence fails after the restore', async () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-id', [player], player, 'spectator-id');
    const originalError = console.error;
    console.error = () => {};

    try {
      await recordHiddenInformationUndo(game, player, () => Promise.reject(new Error('save failed')));
    } finally {
      console.error = originalError;
    }

    const message = game.gameLog[game.gameLog.length - 1]!;
    expect(message.message).eq('${0} undid an action after hidden information was revealed');
    expect(message.type).eq(LogMessageType.WARNING);
  });
});
