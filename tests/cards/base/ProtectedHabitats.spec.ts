import {expect} from 'chai';
import {Penguins} from '../../../src/server/cards/promo/Penguins';
import {ProtectedHabitats} from '../../../src/server/cards/base/ProtectedHabitats';
import {ProtectedHabitatsBetterMars} from '../../../src/server/cards/betterMars/ProtectedHabitatsBetterMars';
import {testGame} from '../../TestGame';
import {cast} from '@/common/utils/utils';
import {Birds} from '../../../src/server/cards/base/Birds';
import {RemoveResourcesFromCard} from '../../../src/server/deferredActions/RemoveResourcesFromCard';
import {CardResource} from '../../../src/common/CardResource';

describe('ProtectedHabitats', () => {
  it('Should play', () => {
    const card = new ProtectedHabitats();
    const [/* game */, player, player2, player3] = testGame(3);
    cast(card.play(player), undefined);

    const penguins = new Penguins();
    penguins.resourceCount = 1;
    player.playedCards.push(penguins);
    const birds = new Birds();
    player2.playedCards.push(birds);
    birds.resourceCount = 1;

    const first = RemoveResourcesFromCard.getAvailableTargetCards(player3, CardResource.ANIMAL);
    expect(first).to.have.members([birds, penguins]);

    player.playedCards.push(card);

    const second = RemoveResourcesFromCard.getAvailableTargetCards(player3, CardResource.ANIMAL);
    expect(second).deep.eq([birds]);
  });

  it('protects animal resources under the BetterMars (Mars tag) variant too', () => {
    const card = new ProtectedHabitatsBetterMars();
    const [/* game */, player, player2, player3] = testGame(3);
    player.playedCards.push(card);

    const penguins = new Penguins();
    penguins.resourceCount = 1;
    player.playedCards.push(penguins);
    const birds = new Birds();
    player2.playedCards.push(birds);
    birds.resourceCount = 1;

    const targets = RemoveResourcesFromCard.getAvailableTargetCards(player3, CardResource.ANIMAL);
    expect(targets).deep.eq([birds]);
  });

  it('protects plants under the BetterMars (Mars tag) variant too', () => {
    const [/* game */, player] = testGame(2);
    expect(player.plantsAreProtected()).is.false;

    player.playedCards.push(new ProtectedHabitatsBetterMars());
    expect(player.plantsAreProtected()).is.true;
  });
});
