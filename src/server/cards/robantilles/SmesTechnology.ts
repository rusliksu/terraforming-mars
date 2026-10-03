import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class SmesTechnology extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SMES_TECHNOLOGY,
      tags: [Tag.SCIENCE, Tag.POWER],
      cost: 5,

      requirements: {tag: Tag.SCIENCE, count: 1},

      metadata: {
        cardNumber: 'H45',
        renderData: CardRenderer.builder((b) => {
          b.text('EFFECT: DURING PRODUCTION, YOU MAY KEEP UP TO 3 ENERGY RESOURCES INSTEAD OF CONVERTING THEM TO HEAT.', {size: Size.SMALL});
        }),
        description: 'Requires 1 Science tag.',
      },
    });
  }
}
