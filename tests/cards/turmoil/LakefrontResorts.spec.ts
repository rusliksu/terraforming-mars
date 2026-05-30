import {expect} from 'chai';
import {LakefrontResorts} from '../../../src/server/cards/turmoil/LakefrontResorts';
import {addOcean, formatMessage, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('LakefrontResorts', () => {
  it('Should play', () => {
    const card = new LakefrontResorts();
    const [game, player] = testGame(2);
    const play = card.play(player);

    expect(play).is.undefined;

    player.playedCards.push(card);
    addOcean(player, '06');
    addOcean(player, '07');
    runAllActions(game);

    expect(player.production.megacredits).to.eq(2);
    expect(game.gameLog.map(formatMessage)).contains('blue gained 1 M€ production because of Lakefront Resorts');
    // The 2 oceans are adjacent
    expect(player.megaCredits).to.eq(3);
  });
});
