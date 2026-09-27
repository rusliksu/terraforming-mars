import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

/**
 * A persistent research-phase buy cap paired with a flat M€-production bump.
 * Mirrors Mars Maths' `nextResearchKeepMax`-style cap, but permanently: see the
 * `playedCards.has(CardName.BUDGET_RESTRICTIONS)` check added in Player.runResearchPhase().
 */
export class BudgetRestrictions extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.BUDGET_RESTRICTIONS,
      tags: [Tag.EARTH],
      cost: 7,

      behavior: {
        production: {megacredits: 3},
      },

      metadata: {
        cardNumber: 'I01',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(3)).br;
          b.minus().cards(3, {digit}).asterix();
        }),
        description: 'Increase your M€ production 3 steps. During each of your research phases, you may buy at most 3 cards.',
      },
    });
  }
}
