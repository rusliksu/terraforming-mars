import {expect} from 'chai';
import {RoundingError} from '../../../src/server/cards/sillyfication/RoundingError';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {MicroPlant} from '../../../src/server/cards/sillyfication/MicroPlant';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('RoundingError', () => {
  let card: RoundingError;
  let player: TestPlayer;

  beforeEach(() => {
    card = new RoundingError();
    [/* game */, player] = testGame(2);
  });

  it('cannot play with more than 2 science tags', () => {
    player.tagsForTest = {science: 3};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('discounts cards with an odd base cost by 1', () => {
    // Micro Plants costs 5 (odd), Micro Credits costs 2 (even).
    expect(card.getCardDiscount(player, new MicroPlant())).to.eq(1);
    expect(card.getCardDiscount(player, new MicroCredits())).to.eq(0);
  });
});
