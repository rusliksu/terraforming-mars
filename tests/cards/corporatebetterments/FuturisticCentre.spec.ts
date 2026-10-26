import {expect} from 'chai';
import {FuturisticCentre} from '../../../src/server/cards/corporatebetterments/FuturisticCentre';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('FuturisticCentre', () => {
  let card: FuturisticCentre;
  let player: TestPlayer;

  beforeEach(() => {
    card = new FuturisticCentre();
    [/* game */, player] = testGame(2);
  });

  it('reduces the cost to buy a card by 1 M€', () => {
    const before = player.cardCost;
    card.play(player);
    expect(player.cardCost).eq(before - 1);
  });

  it('scores 1 VP', () => {
    expect(card.getVictoryPoints(player)).eq(1);
  });
});
