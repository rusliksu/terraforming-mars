import {expect} from 'chai';
import {BudgetManagement} from '../../../src/server/cards/idesofmars/BudgetManagement';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';

describe('BudgetManagement', () => {
  let card: BudgetManagement;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BudgetManagement();
    [/* game */, player] = testGame(2);
  });

  it('cannot act with more than 3 cards in hand', () => {
    player.cardsInHand = [new SearchForLife(), new SearchForLife(), new SearchForLife(), new SearchForLife()];
    expect(card.canAct(player)).is.false;
  });

  it('can act with 3 or fewer cards in hand', () => {
    player.cardsInHand = [new SearchForLife(), new SearchForLife(), new SearchForLife()];
    expect(card.canAct(player)).is.true;
  });

  it('adds 1 Budget resource when the hand is not empty', () => {
    player.cardsInHand = [new SearchForLife()];
    card.action(player);
    expect(card.resourceCount).to.eq(1);
  });

  it('adds 2 Budget resources when the hand is empty', () => {
    player.cardsInHand = [];
    card.action(player);
    expect(card.resourceCount).to.eq(2);
  });

  it('scores 1 VP for every 2 Budget resources on this card', () => {
    expect(card.getVictoryPoints(player)).to.eq(0);
    player.addResourceTo(card, 2);
    expect(card.getVictoryPoints(player)).to.eq(1);
    player.addResourceTo(card, 1);
    expect(card.getVictoryPoints(player)).to.eq(1);
    player.addResourceTo(card, 1);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
