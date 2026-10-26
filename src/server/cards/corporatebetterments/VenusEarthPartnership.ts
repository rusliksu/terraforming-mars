import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class VenusEarthPartnership extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.VENUS_EARTH_PARTNERSHIP,
      tags: [Tag.EARTH, Tag.VENUS],
      cost: 16,
      victoryPoints: 5,

      requirements: [{tag: Tag.EARTH, count: 3}, {tag: Tag.VENUS, count: 3}],

      metadata: {
        cardNumber: 'CB48',
        renderData: CardRenderer.builder((b) => {
          b.text('Requires 3 Earth tags and 3 Venus tags.', {size: Size.SMALL});
        }),
      },
    });
  }
}
