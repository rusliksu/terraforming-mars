import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {PatentPooling} from '../../../src/server/cards/idesofmars/PatentPooling';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {MicroMills} from '@/server/cards/base/MicroMills';
import {PowerPlant} from '@/server/cards/base/PowerPlant';

describe('PatentPooling', () => {
  let card: PatentPooling;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PatentPooling();
    [game, player] = testGame(1);
  });

  it('offers the buy-or-discard action once per generation after being played', () => {
    player.megaCredits = 3;
    const boughtCard = new MicroMills();
    const discardedCard = new PowerPlant();
    game.projectDeck.drawPile.push(discardedCard, boughtCard);

    player.playCard(card);
    runAllActions(game);
    expect(player.popWaitingFor()).is.undefined;
    expect(player.cardsInHand).is.empty;

    const action = cast(player.getActions().options.find((option) =>
      option.title === 'Perform an action from a played card'), SelectCard);
    expect(action.cards).includes(card);
    action.process({type: 'card', cards: [card.name]});
    runAllActions(game);

    const buy = cast(player.popWaitingFor(), SelectCard);
    expect(buy.cards).deep.eq([boughtCard]);
    buy.process({type: 'card', cards: [boughtCard.name]});
    runAllActions(game);

    expect(player.cardsInHand).deep.eq([boughtCard]);
    expect(player.megaCredits).to.eq(0);
    expect(player.getPlayableActionCards()).not.includes(card);

    player.runProductionPhase();
    game.generation++;
    const moneyBeforeAction = player.megaCredits;
    const nextAction = cast(player.getActions().options.find((option) =>
      option.title === 'Perform an action from a played card'), SelectCard);
    expect(nextAction.cards).includes(card);
    nextAction.process({type: 'card', cards: [card.name]});
    runAllActions(game);

    const discard = cast(player.popWaitingFor(), SelectCard);
    expect(discard.cards).deep.eq([discardedCard]);
    discard.process({type: 'card', cards: []});
    runAllActions(game);

    expect(game.projectDeck.discardPile).includes(discardedCard);
    expect(player.cardsInHand).deep.eq([boughtCard]);
    expect(player.megaCredits).to.eq(moneyBeforeAction);
    expect(player.getPlayableActionCards()).not.includes(card);
  });

  it('allows looking and discarding when the player cannot afford the card', () => {
    player.megaCredits = 2;
    player.playedCards.push(card);
    const topCard = new MicroMills();
    game.projectDeck.drawPile.push(topCard);
    const action = cast(player.playActionCard(), SelectCard);
    expect(action.cards).includes(card);
    action.process({type: 'card', cards: [card.name]});
    runAllActions(game);

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards).deep.eq([topCard]);
    expect(() => selectCard.process({type: 'card', cards: [topCard.name]})).to.throw('Too many cards selected');
    selectCard.process({type: 'card', cards: []});
    runAllActions(game);

    expect(game.projectDeck.discardPile).includes(topCard);
    expect(player.cardsInHand).is.empty;
    expect(player.megaCredits).to.eq(2);
  });
});
