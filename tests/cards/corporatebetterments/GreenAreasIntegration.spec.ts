import {expect} from 'chai';
import {cast} from '@/common/utils/utils';
import {GreenAreasIntegration} from '../../../src/server/cards/corporatebetterments/GreenAreasIntegration';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('GreenAreasIntegration', () => {
  let card: GreenAreasIntegration;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GreenAreasIntegration();
    [/* game */, player] = testGame(1);
  });

  it('does nothing when the player has no plants', () => {
    player.plants = 0;
    expect(card.play(player)).is.undefined;
  });

  it('offers up to 5 conversions, capped by available plants', () => {
    player.plants = 24;
    const startingTr = player.terraformRating;

    const selectAmount = cast(card.play(player), SelectAmount);
    expect(selectAmount.min).to.eq(0);
    expect(selectAmount.max).to.eq(5);

    selectAmount.cb(3);

    expect(player.plants).to.eq(24 - 9);
    expect(player.terraformRating).to.eq(startingTr + 3);
  });

  it('caps the offered amount by available plants when fewer than 15', () => {
    player.plants = 7;

    const selectAmount = cast(card.play(player), SelectAmount);
    expect(selectAmount.max).to.eq(2);
  });

  it('scores 2 flat victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
