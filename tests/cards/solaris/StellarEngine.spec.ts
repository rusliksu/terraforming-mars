import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {StellarEngine} from '../../../src/server/cards/solaris/StellarEngine';

describe('StellarEngine', () => {
  let card: StellarEngine;
  let player: TestPlayer;

  beforeEach(() => {
    card = new StellarEngine();
    [, player] = testGame(2);
    player.megaCredits = card.cost;
  });

  it('cannot play with fewer than 11 Science tags', () => {
    player.tagsForTest = {science: 10};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 11 Science tags', () => {
    player.tagsForTest = {science: 11};
    expect(card.canPlay(player)).is.true;
  });

  it('discounts every subsequent card play by 5 M€', () => {
    // tagsForTest, once set, fully overrides tag counting (see TestTags.rawCount), which
    // would otherwise mask this card's own Galactic tags below -- so this leaves it unset
    // and relies only on the card actually being in the player's tableau.
    player.playedCards.push(card);
    expect(card.getCardDiscount(player, card)).to.eq(5);
  });

  it('victoryPoints counts both of its own Galactic tags', () => {
    player.playedCards.push(card);
    expect(card.getVictoryPoints(player)).to.eq(6);
  });
});
