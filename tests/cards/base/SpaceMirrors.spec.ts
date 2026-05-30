import {expect} from 'chai';
import {SpaceMirrors} from '../../../src/server/cards/base/SpaceMirrors';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {formatMessage} from '../../TestingUtils';

describe('SpaceMirrors', () => {
  let card: SpaceMirrors;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SpaceMirrors();
    [game, player] = testGame(2);
  });

  it('Can not act', () => {
    player.megaCredits = 6;
    expect(card.canAct(player)).is.not.true;
  });

  it('Should act', () => {
    player.megaCredits = 7;
    expect(card.canAct(player)).is.true;

    game.gameLog.length = 0;
    card.action(player);
    game.deferredActions.runNext();
    expect(player.megaCredits).to.eq(0);
    expect(player.production.energy).to.eq(1);
    expect(game.gameLog.map(formatMessage)).contains('blue gained 1 energy production');
  });
});
