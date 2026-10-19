import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MeteorShower extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.METEOR_SHOWER_RA,
      tags: [Tag.SPACE],
      cost: 21,
      victoryPoints: 1,

      behavior: {
        stock: {steel: 5, titanium: 4},
      },

      metadata: {
        cardNumber: 'H68',
        renderData: CardRenderer.builder((b) => {
          b.steel(5, {digit: true}).titanium(4, {digit: true});
        }),
        description: 'Gain 5 steel and 4 titanium.',
      },
    });
  }
}
