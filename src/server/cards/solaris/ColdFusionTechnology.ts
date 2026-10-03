import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Cold Fusion Technology (Solaris, fan): the printed tags are Science plus two Power tags -- one
 * a normal Power icon, the other a distinctive yellow/black radioactive-trefoil icon. Per the
 * task spec, the trefoil is treated as a second Power tag rather than inventing a new tag.
 */
export class ColdFusionTechnology extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 21,
      tags: [Tag.SCIENCE, Tag.POWER, Tag.POWER],
      name: CardName.COLD_FUSION_TECHNOLOGY,
      type: CardType.AUTOMATED,

      requirements: {party: PartyName.EMPOWER},

      behavior: {
        production: {heat: -2, energy: 5},
      },

      metadata: {
        cardNumber: 'SOL24',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().heat(2).br;
            pb.plus().energy(5);
          });
        }),
        description: 'Requires that Empower is ruling or that you have 2 delegates there. ' +
          'Decrease your Heat production 2 steps and increase your Energy production 5 steps.',
      },
    });
  }
}
