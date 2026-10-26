import {expect} from 'chai';
import {HypersonicFighters} from '../../../src/server/cards/solaris/HypersonicFighters';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('HypersonicFighters', () => {
  it('cannot play below 2% oxygen', () => {
    const card = new HypersonicFighters();
    const [game, player] = testGame(1);

    (game as any).oxygenLevel = 1;
    expect(card.canPlay(player)).is.false;
    (game as any).oxygenLevel = 2;
    expect(card.canPlay(player)).is.true;
  });

  it('spends 1 M€ for 1 fighter when that is the only affordable option', () => {
    const card = new HypersonicFighters();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    player.megaCredits = 1;
    player.steel = 0;
    player.titanium = 0;

    cast(card.action(player), undefined);
    runAllActions(game);

    expect(player.megaCredits).eq(0);
    expect(card.resourceCount).eq(1);
  });

  it('spends 1 steel for 2 fighters when that is the only affordable option', () => {
    const card = new HypersonicFighters();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    player.megaCredits = 0;
    player.steel = 1;
    player.titanium = 0;

    cast(card.action(player), undefined);
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(card.resourceCount).eq(2);
  });

  it('spends 1 titanium for 3 fighters when that is the only affordable option', () => {
    const card = new HypersonicFighters();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    player.megaCredits = 0;
    player.steel = 0;
    player.titanium = 1;

    cast(card.action(player), undefined);
    runAllActions(game);

    expect(player.titanium).eq(0);
    expect(card.resourceCount).eq(3);
  });

  it('scores 1 VP per 3 fighters', () => {
    const card = new HypersonicFighters();
    const [/* game */, player] = testGame(1);

    card.resourceCount = 9;
    expect(card.getVictoryPoints(player)).eq(3);
  });
});
