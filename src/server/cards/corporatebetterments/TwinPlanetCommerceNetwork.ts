import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class TwinPlanetCommerceNetwork extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TWIN_PLANET_COMMERCE_NETWORK,
      tags: [Tag.VENUS, Tag.EARTH],
      cost: 28,

      requirements: {floaters: 1},

      behavior: {
        tr: {cities: {where: 'offmars'}},
        addResourcesToAnyCard: {count: 3, type: CardResource.FLOATER},
      },

      metadata: {
        cardNumber: 'B44',
        renderData: CardRenderer.builder((b) => {
          b.tr(1).slash().city({all}).br;
          b.resource(CardResource.FLOATER, 3).asterix();
        }),
        description: 'Requires that you have at least 1 floater. Raise your TR 1 step for each city tile ' +
          'not on Mars in play. Add 3 floaters to any card.',
      },
    });
  }
}
