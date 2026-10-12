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
          b.text('Keep up to', {size: Size.SMALL}).energy(3).asterix().br;
          b.description('During production, you may keep up to 3 energy resources instead of converting them to heat.');
        }),
        description: 'Requires 1 Science tag.',
      },
    });
  }
}
