import {expect} from 'chai';
import {Phase} from '@/common/Phase';
import {cast} from '@/common/utils/utils';
import {BudgetRestrictions} from '@/server/cards/idesofmars/BudgetRestrictions';
import {SelectCard} from '@/server/inputs/SelectCard';
import {testGame} from '@tests/TestGame';
import {runAllActions} from '@tests/TestingUtils';

describe('Research purchase undo limits', () => {
  for (const restriction of ['budget', 'one-shot'] as const) {
    it(`preserves the ${restriction} keep limit after undo`, () => {
      const [game, player] = testGame(2, {undoStepOption: true});
      game.phase = Phase.RESEARCH;
      player.megaCredits = 100;
      if (restriction === 'budget') {
        player.playedCards.push(new BudgetRestrictions());
      } else {
        player.nextResearchKeepMax = 2;
      }
      player.runResearchPhase();
      const input = cast(player.popWaitingFor(), SelectCard);
      expect(input.config.max).eq(restriction === 'budget' ? 3 : 2);
      input.cb([]);
      runAllActions(game);
      expect(player.canUndoResearchPurchase()).is.true;
      player.undoResearchPurchase();
      const reopened = cast(player.popWaitingFor(), SelectCard);
      expect(reopened.config.max).eq(input.config.max);
    });
  }
});
