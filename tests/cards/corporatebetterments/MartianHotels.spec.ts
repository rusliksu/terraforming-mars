import {expect} from 'chai';
import {MartianHotels} from '../../../src/server/cards/corporatebetterments/MartianHotels';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('MartianHotels', () => {
  let card: MartianHotels;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new MartianHotels();
    [/* game */, player, player2] = testGame(2);
  });

  it('pays 5 M€ per pair of Building tags, counting this card', () => {
    // 3 existing Building tags + this card's own tag = 4, i.e. 2 pairs.
    player.tagsForTest = {building: 3};
    card.play(player);
    expect(player.megaCredits).to.eq(10);
  });

  it('gives no bonus when fewer than 2 Building tags total', () => {
    player.tagsForTest = {building: 0};
    card.play(player);
    expect(player.megaCredits).to.eq(0);
  });

  it('gives each opponent 1 M€ per Building tag they have', () => {
    player2.tagsForTest = {building: 3};
    card.play(player);
    expect(player2.megaCredits).to.eq(3);
  });
});
