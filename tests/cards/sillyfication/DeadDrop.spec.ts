import {expect} from 'chai';
import {DeadDrop} from '../../../src/server/cards/sillyfication/DeadDrop';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('DeadDrop', () => {
  let card: DeadDrop;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DeadDrop();
    [game, player] = testGame(1);
  });

  it('is a free, tagless event', () => {
    expect(card.type).to.eq(CardType.EVENT);
    expect(card.cost).to.eq(0);
    expect(card.tags).to.deep.eq([]);
  });

  it('cannot be played with an empty hand (nothing to discard)', () => {
    player.cardsInHand = [];
    expect(card.canPlay(player)).is.false;
  });

  it('can be played with a card in hand', () => {
    player.cardsInHand = [fakeCard({})];
    expect(card.canPlay(player)).is.true;
  });

  it('discards a card, then lets you draw a card', () => {
    // Exactly 1 card in hand (== DiscardCards' min) auto-discards it without a prompt.
    const discardable = fakeCard({});
    player.cardsInHand = [discardable];

    card.play(player);
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    const cardsBefore = player.cardsInHand.length;
    orOptions.options[0].cb();
    runAllActions(game);

    expect(game.projectDeck.discardPile).to.include(discardable);
    expect(player.cardsInHand.length).to.eq(cardsBefore + 1);
  });

  it('discards a chosen card (when more than 1 is in hand), then lets you gain 5 M€ instead', () => {
    const discardable = fakeCard({});
    const keeper = fakeCard({});
    player.cardsInHand = [discardable, keeper];

    card.play(player);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([discardable]);
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    const megaCreditsBefore = player.megaCredits;
    orOptions.options[1].cb();
    runAllActions(game);

    expect(game.projectDeck.discardPile).to.include(discardable);
    expect(player.cardsInHand).to.include(keeper);
    expect(player.megaCredits).to.eq(megaCreditsBefore + 5);
  });

  it('removes itself from the tableau once resolved, so a second physical copy can be played later without a duplicate-name crash', () => {
    // Simulates what Player.playCard's normal bookkeeping does: the played instance gets
    // pushed into playedCards before its own effect resolves.
    const firstCopy = new DeadDrop();
    player.playedCards.push(firstCopy);
    player.cardsInHand = [fakeCard({})];

    firstCopy.play(player);
    runAllActions(game);
    const orOptions = cast(player.popWaitingFor(), OrOptions);
    orOptions.options[1].cb(); // Gain 5 M€
    runAllActions(game);

    expect(player.playedCards.has(CardName.DEAD_DROP)).is.false;

    const secondCopy = new DeadDrop();
    expect(() => player.playedCards.push(secondCopy)).to.not.throw();
  });
});
