import {IProjectCard} from '@/server/cards/IProjectCard';
import {ActionCard} from '@/server/cards/ActionCard';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class OrbitalCleanupRebalanced extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ORBITAL_CLEANUP_REBALANCED,
      tags: [Tag.EARTH, Tag.SPACE],
      cost: 14,
      victoryPoints: 2,

      action: {
        stock: {megacredits: {tag: Tag.SCIENCE, per: 2}},
      },

      metadata: {
        cardNumber: 'X08',

        renderData: CardRenderer.builder((b) => {
          b.action('Gain 1 M€ per 2 science tags you have.', (eb) => {
            eb.empty().startAction.megacredits(1).slash().tag(Tag.SCIENCE, 2);
          }).br;
        }),
      },
    });
  }
}
