import {expect} from 'chai';
import {ChooseCards} from '../../src/server/deferredActions/ChooseCards';
import {SelectCard} from '../../src/server/inputs/SelectCard';
import {testGame} from '../TestGame';
import {TestPlayer} from '../TestPlayer';
import {AquiferPumping} from '../../src/server/cards/base/AquiferPumping';
import {IoMiningIndustries} from '../../src/server/cards/base/IoMiningIndustries';
import {cast} from '../TestingUtils';
import {EarthCatapult} from '../../src/server/cards/base/EarthCatapult';

describe('ChooseCards', () => {
  let player: TestPlayer;
  let aquiferPumping: AquiferPumping;
  let ioMiningIndustries: IoMiningIndustries;

  beforeEach(() => {
    [/* game */, player] = testGame(1);
    aquiferPumping = new AquiferPumping();
    ioMiningIndustries = new IoMiningIndustries();
    player.megaCredits = 100;
  });

  it('shows calculated project costs when buying cards', () => {
    player.cardCost = 7;
    player.playedCards.push(new EarthCatapult());

    const selectCard = cast(
      new ChooseCards(player, [aquiferPumping, ioMiningIndustries], {paying: true}).execute(),
      SelectCard,
    );

    const model = selectCard.toModel(player);

    expect(model.cards).has.length(2);
    expect(model.cards[0].calculatedCost).to.eq(player.getCardCost(aquiferPumping));
    expect(model.cards[1].calculatedCost).to.eq(player.getCardCost(ioMiningIndustries));
    expect(model.cards[0].calculatedCost).not.to.eq(player.cardCost);
  });
});
