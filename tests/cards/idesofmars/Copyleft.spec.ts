import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {Copyleft} from '../../../src/server/cards/idesofmars/Copyleft';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Tag} from '../../../src/common/cards/Tag';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('Copyleft', () => {
  let card: Copyleft;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Copyleft();
    [game, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('does nothing when a non-Science card is played', () => {
    const nonScience = fakeCard({tags: []});
    player2.onCardPlayed(nonScience);
    runAllActions(game);

    expect(player.getWaitingFor()).is.undefined;
    expect(player2.getWaitingFor()).is.undefined;
  });

  it('offers the revealed card first to whoever played the Science tag', () => {
    player2.megaCredits = 10;
    const scienceCard = fakeCard({tags: [Tag.SCIENCE]});
    const startingHandSize = player2.cardsInHand.length;

    player2.onCardPlayed(scienceCard);
    runAllActions(game);

    const orOptions = cast(player2.popWaitingFor(), OrOptions);
    orOptions.options[0].cb(); // Buy

    expect(player2.megaCredits).to.eq(7);
    expect(player2.cardsInHand.length).to.eq(startingHandSize + 1);
    expect(player.getWaitingFor()).is.undefined;
  });

  it('lets the Copyleft owner buy it if the tag player cannot afford it', () => {
    player2.megaCredits = 0;
    player.megaCredits = 10;
    const scienceCard = fakeCard({tags: [Tag.SCIENCE]});
    const startingHandSize = player.cardsInHand.length;

    player2.onCardPlayed(scienceCard);
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    orOptions.options[0].cb(); // Buy

    expect(player.megaCredits).to.eq(7);
    expect(player.cardsInHand.length).to.eq(startingHandSize + 1);
  });

  it('discards the revealed card if nobody buys it', () => {
    player2.megaCredits = 10;
    player.megaCredits = 10;
    const scienceCard = fakeCard({tags: [Tag.SCIENCE]});
    const startingDiscardSize = game.projectDeck.discardPile.length;

    player2.onCardPlayed(scienceCard);
    runAllActions(game);

    const firstOffer = cast(player2.popWaitingFor(), OrOptions);
    firstOffer.options[1].cb(); // Pass
    runAllActions(game);

    const secondOffer = cast(player.popWaitingFor(), OrOptions);
    secondOffer.options[1].cb(); // Pass

    expect(game.projectDeck.discardPile.length).to.eq(startingDiscardSize + 1);
  });

  it('does not offer the Copyleft owner a second chance when they played the tag themselves', () => {
    player.megaCredits = 0;
    const scienceCard = fakeCard({tags: [Tag.SCIENCE]});
    const startingDiscardSize = game.projectDeck.discardPile.length;

    player.onCardPlayed(scienceCard);
    runAllActions(game);

    // Player cannot afford it, and since they are both the tag-player and the owner,
    // there is no separate fallback offer: it goes straight to discard.
    expect(player.getWaitingFor()).is.undefined;
    expect(game.projectDeck.discardPile.length).to.eq(startingDiscardSize + 1);
  });
});
