import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {PatentPooling} from '../../../src/server/cards/idesofmars/PatentPooling';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {churn} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('PatentPooling', () => {
  let card: PatentPooling;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PatentPooling();
    [game, player] = testGame(1);
  });

  it('reveals the top card and lets the player buy it', () => {
    player.megaCredits = 3;

    const selectCard = cast(churn(card.play(player), player), SelectCard);
    selectCard.cb([selectCard.cards[0]]);
    game.deferredActions.runNext();

    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.megaCredits).to.eq(0);
  });

  it('discards the revealed card if the player declines to buy it', () => {
    player.megaCredits = 3;
    const startingDiscardSize = game.projectDeck.discardPile.length;

    const selectCard = cast(churn(card.play(player), player), SelectCard);
    selectCard.cb([]);

    expect(game.projectDeck.discardPile).has.lengthOf(startingDiscardSize + 1);
    expect(player.cardsInHand).has.lengthOf(0);
    expect(player.megaCredits).to.eq(3);
  });
});
