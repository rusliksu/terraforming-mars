import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {MausoleumAtHellas} from '../../../src/server/cards/robantilles/MausoleumAtHellas';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('MausoleumAtHellas', () => {
  let card: MausoleumAtHellas;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MausoleumAtHellas();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot act without a card in hand to discard', () => {
    player.cardsInHand = [];
    expect(card.canAct(player)).is.false;
  });

  it('discards a card from hand to add 1 relic resource to this card', () => {
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

  it('scores 1 VP for each relic resource on this card', () => {
    expect(card.getVictoryPoints(player)).to.eq(0);

    player.addResourceTo(card, 3);
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
