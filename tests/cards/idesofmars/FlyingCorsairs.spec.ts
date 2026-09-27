import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {FlyingCorsairs} from '../../../src/server/cards/idesofmars/FlyingCorsairs';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {FloatingHabs} from '../../../src/server/cards/venusNext/FloatingHabs';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';

describe('FlyingCorsairs', () => {
  let card: FlyingCorsairs;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new FlyingCorsairs();
    [/* game */, player, opponent] = testGame(2);
  });

  it('cannot play when no opponent has a floater', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play when an opponent has a floater', () => {
    const dirigibles = new Dirigibles();
    opponent.playedCards.push(dirigibles);
    opponent.addResourceTo(dirigibles, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('steals a floater onto one of the acting player\'s own floater cards, and removes 2 more', () => {
    const opponentDirigibles = new Dirigibles();
    opponent.playedCards.push(opponentDirigibles);
    opponent.addResourceTo(opponentDirigibles, 3);

    const ownFloatingHabs = new FloatingHabs();
    player.playedCards.push(ownFloatingHabs);

    card.play(player);
    runAllActions(player.game);

    // 3 - 1 (stolen) - 2 (removed) = 0 left on the opponent's card.
    expect(opponentDirigibles.resourceCount).to.eq(0);
    expect(ownFloatingHabs.resourceCount).to.eq(1);
  });

  it('removes 2 floaters from an opponent even without a destination card for the stolen one', () => {
    const opponentDirigibles = new Dirigibles();
    opponent.playedCards.push(opponentDirigibles);
    opponent.addResourceTo(opponentDirigibles, 5);

    card.play(player);
    runAllActions(player.game);

    // 5 - 1 (stolen) - 2 (removed) = 2 remaining. No floater card of the acting player's own,
    // so the stolen floater simply has nowhere to land.
    expect(opponentDirigibles.resourceCount).to.eq(2);
  });
});
