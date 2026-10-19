import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {ActionCard} from '@/server/cards/ActionCard';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class UndergroundDetonationsRebalanced extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.UNDERGROUND_DETONATIONS_REBALANCED,
      tags: [Tag.BUILDING],
      cost: 2,

      action: {
        spend: {megacredits: 8, canUseSteel: true},
        production: {heat: 2},
      },

      metadata: {
        cardNumber: '202',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 8M€ to increase your heat production 2 steps. STEEL MAY BE USED as if you were playing a Building card.', (eb) => {
            eb.megacredits(8).super((b) => b.steel(1)).startAction.production((pb)=>pb.heat(2));
          });
        }),
      },
    });
  }
}
