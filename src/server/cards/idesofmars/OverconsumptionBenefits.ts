import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {all} from '../Options';

export class OverconsumptionBenefits extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.OVERCONSUMPTION_BENEFITS,
      tags: [],
      cost: 11,

      requirements: {tag: Tag.POWER, count: 2},

      behavior: {
        production: {heat: {cities: {where: 'onmars'}, all: false}},
      },

      metadata: {
        cardNumber: 'I53',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.heat(1).slash();
            pb.city({size: Size.SMALL, all}).asterix();
          });
        }),
        description: 'Requires that you own at least 2 Power tags. Increase your heat production 1 step for each city tile ON MARS.',
      },
    });
  }
}
