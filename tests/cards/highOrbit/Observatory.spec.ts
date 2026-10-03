import {expect} from 'chai';
import {Observatory} from '../../../src/server/cards/highOrbit/Observatory';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('Observatory', () => {
  let card: Observatory;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Observatory();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot act without a card in hand to discard', () => {
    player.cardsInHand = [];
    expect(card.canAct(player)).is.false;
  });

  it('discards a card from hand to add 1 data resource to this card', () => {
    const discardMe = fakeCard();
    player.cardsInHand = [discardMe];
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);
    cast(player.popWaitingFor(), SelectCard).cb([discardMe]);
    runAllActions(game);

    expect(player.cardsInHand).to.not.include(discardMe);
    expect(card.resourceCount).to.eq(1);
  });

  it('awards 1 VP for every 3 data', () => {
    card.resourceCount = 2;
    expect(card.getVictoryPoints(player)).to.eq(0);
    card.resourceCount = 3;
    expect(card.getVictoryPoints(player)).to.eq(1);
    card.resourceCount = 6;
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
