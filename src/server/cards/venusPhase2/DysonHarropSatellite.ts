import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class DysonHarropSatellite extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.DYSON_HARROP_SATELLITE,
      tags: [Tag.POWER, Tag.SPACE],
      cost: 13,
      requirements: {tag: Tag.SCIENCE, count: 2},

      behavior: {
        production: {energy: 3},
      },

      metadata: {
        cardNumber: 'V62',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(3));
        }),
        description: 'Requires that you have at least 2 Science tags. Increase your energy production 3 steps.',
      },
    });
  }
}
