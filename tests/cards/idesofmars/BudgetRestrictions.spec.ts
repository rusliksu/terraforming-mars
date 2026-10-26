import {expect} from 'chai';
import {BudgetRestrictions} from '../../../src/server/cards/idesofmars/BudgetRestrictions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('BudgetRestrictions', () => {
  let card: BudgetRestrictions;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BudgetRestrictions();
    [/* game */, player] = testGame(2);
  });

  it('increases M€ production 3 steps', () => {
    player.production.override({megacredits: 0});
    card.play(player);
    expect(player.production.megacredits).to.eq(3);
  });

  it('caps the research phase to buying at most 3 cards', () => {
    player.playedCards.push(card);
    player.megaCredits = 100;

    player.runResearchPhase();

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.config.max).to.eq(3);
  });
});
