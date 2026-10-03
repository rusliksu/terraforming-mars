import {IActionCard} from '@/server/cards/ICard';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {ActionCard} from '@/server/cards/ActionCard';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class UnderwaterOutpost extends ActionCard implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.UNDERWATER_OUTPOST,
      tags: [Tag.SCIENCE, Tag.BUILDING],
      cost: 27,
      victoryPoints: 2,

      requirements: {oceans: 2},

      action: {
        drawCard: {count: 2, keep: 1},
      },

      metadata: {
        cardNumber: 'CB05',
        renderData: CardRenderer.builder((b) => {
          b.action('Draw 2 cards, then discard 1 card.', (eb) => {
            eb.empty().startAction.cards(2).minus().cards(1);
          });
        }),
        description: 'Requires 2 oceans in play.',
      },
    });
  }
}
