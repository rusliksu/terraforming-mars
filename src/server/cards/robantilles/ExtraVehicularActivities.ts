import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ExtraVehicularActivities extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.EXTRA_VEHICULAR_ACTIVITIES,
      tags: [Tag.SCIENCE, Tag.SPACE],
      cost: 7,

      requirements: {tag: Tag.SPACE, count: 2},

      behavior: {
        production: {megacredits: 2},
      },

      metadata: {
        cardNumber: 'H58',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(2));
        }),
        description: 'Requires 2 Space tags. Increase your M€ production 2 steps.',
      },
    });
  }
}
