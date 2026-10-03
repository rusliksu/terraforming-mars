import {expect} from 'chai';
import {DerivedProducts} from '../../../src/server/cards/idesofmars/DerivedProducts';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {GanymedeColony} from '../../../src/server/cards/base/GanymedeColony';

describe('DerivedProducts', () => {
  let card: DerivedProducts;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DerivedProducts();
    [, player] = testGame(1);
  });

  it('cannot play without at least 3 VP on played cards', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with at least 3 VP on played cards', () => {
    const ganymedeColony = new GanymedeColony();
    player.playedCards.push(ganymedeColony);
    player.tagsForTest = {jovian: 3};
    expect(ganymedeColony.getVictoryPoints(player)).to.eq(3);

    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production on play', () => {
    const ganymedeColony = new GanymedeColony();
    player.playedCards.push(ganymedeColony);
    player.tagsForTest = {jovian: 3};

    card.play(player);
    expect(player.production.megacredits).to.eq(2);
  });
});
