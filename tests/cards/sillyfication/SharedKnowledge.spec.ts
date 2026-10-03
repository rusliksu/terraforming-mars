import {expect} from 'chai';
import {SharedKnowledge} from '../../../src/server/cards/sillyfication/SharedKnowledge';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('SharedKnowledge', () => {
  let card: SharedKnowledge;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new SharedKnowledge();
    [/* game */, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires 4 science tags', () => {
    player.tagsForTest = {science: 3};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 4};
    expect(card.canPlay(player)).is.true;
  });

  it('draws a card when an opponent draws their third card of the generation', () => {
    player.cardsInHand = [];

    card.onCardsDrawn(player, player2, 1);
    expect(player.cardsInHand).has.lengthOf(0);

    card.onCardsDrawn(player, player2, 1);
    expect(player.cardsInHand).has.lengthOf(0);

    card.onCardsDrawn(player, player2, 1);
    expect(player.cardsInHand).has.lengthOf(1);

    // Does not repeat on further draws this generation.
    card.onCardsDrawn(player, player2, 1);
    expect(player.cardsInHand).has.lengthOf(1);
  });

  it('triggers exactly once when the 3rd card arrives in a single multi-card draw', () => {
    player.cardsInHand = [];
    card.onCardsDrawn(player, player2, 4);
    expect(player.cardsInHand).has.lengthOf(1);
  });

  it('ignores your own draws', () => {
    player.cardsInHand = [];
    card.onCardsDrawn(player, player, 5);
    expect(player.cardsInHand).has.lengthOf(0);
  });

  it('resets the count at the start of each generation', () => {
    player.cardsInHand = [];
    card.onCardsDrawn(player, player2, 3);
    expect(player.cardsInHand).has.lengthOf(1);

    card.onProductionPhase(player);
    player.cardsInHand = [];

    card.onCardsDrawn(player, player2, 2);
    expect(player.cardsInHand).has.lengthOf(0);
    card.onCardsDrawn(player, player2, 1);
    expect(player.cardsInHand).has.lengthOf(1);
  });

  it('has a science tag', () => {
    expect(card.tags).to.deep.eq([Tag.SCIENCE]);
  });
});
