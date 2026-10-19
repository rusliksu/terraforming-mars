import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';

export class NativeMicrofauna extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.NATIVE_MICROFAUNA,
      tags: [Tag.MICROBE, Tag.VENUS],
      cost: 11,
      requirements: {venus: 16, max: true},
      victoryPoints: 2,

      behavior: {
        addResourcesToAnyCard: {type: CardResource.MICROBE, count: 2},
      },

      metadata: {
        cardNumber: 'V65',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.MICROBE, 2).asterix();
        }),
        description: 'Requires Venus 16% or less. Add 2 microbes to any card.',
      },
    });
  }
}
