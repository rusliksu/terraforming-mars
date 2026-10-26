import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {MartianRangers} from '../../../src/server/cards/robantilles/MartianRangers';
import {RemoveResourcesFromCard} from '../../../src/server/deferredActions/RemoveResourcesFromCard';
import {CardResource} from '../../../src/common/CardResource';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';

describe('MartianRangers', () => {
  let card: MartianRangers;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MartianRangers();
    [game, player, player2] = testGame(2);
  });

  it('cannot play without an existing card that already has at least 1 Animal', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play once a card with at least 1 Animal exists', () => {
    const fish = fakeCard({resourceType: CardResource.ANIMAL});
    fish.resourceCount = 1;
    player.playedCards.push(fish);

    expect(card.canPlay(player)).is.true;
  });

  it('adds 2 Animals to a card that already has at least 1 Animal', () => {
    const fish = fakeCard({resourceType: CardResource.ANIMAL});
    fish.resourceCount = 1;
    player.playedCards.push(fish);

    card.play(player);
    runAllActions(game);

    expect(fish.resourceCount).to.eq(3);
  });

  it('protects the owner\'s Animal resources from removal by opponents', () => {
    player.playedCards.push(card);
    const fish = fakeCard({resourceType: CardResource.ANIMAL});
    fish.resourceCount = 3;
    player.playedCards.push(fish);

    const targets = RemoveResourcesFromCard.getAvailableTargetCards(player2, CardResource.ANIMAL, 'opponents');
    expect(targets).to.not.include(fish);
  });

  it('does not protect Animal resources without Martian Rangers in play', () => {
    const fish = fakeCard({resourceType: CardResource.ANIMAL});
    fish.resourceCount = 3;
    player.playedCards.push(fish);

    const targets = RemoveResourcesFromCard.getAvailableTargetCards(player2, CardResource.ANIMAL, 'opponents');
    expect(targets).to.include(fish);
  });
});
