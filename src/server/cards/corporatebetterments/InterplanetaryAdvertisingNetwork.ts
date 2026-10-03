import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';

export class InterplanetaryAdvertisingNetwork extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.INTERPLANETARY_ADVERTISING_NETWORK,
      tags: [Tag.MARS, Tag.EARTH],
      cost: 33,
      victoryPoints: 2,

      behavior: {
        tr: {cities: {where: 'onmars'}, all: false},
      },

      metadata: {
        cardNumber: 'CB09',
        renderData: CardRenderer.builder((b) => {
          b.tr(1).slash();
          b.city({size: Size.SMALL}).asterix();
        }),
        description: 'Increase your TR 1 step for each city tile you own on Mars.',
      },
    });
  }
}
