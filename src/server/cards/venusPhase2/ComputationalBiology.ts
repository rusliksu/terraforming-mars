import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';

export class ComputationalBiology extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.COMPUTATIONAL_BIOLOGY,
      tags: [Tag.SCIENCE, Tag.MICROBE],
      cost: 16,
      victoryPoints: 1,

      behavior: {
        addResourcesToAnyCard: [
          {type: CardResource.MICROBE, count: 2},
          {type: CardResource.DATA, count: 2},
        ],
      },

      metadata: {
        cardNumber: 'V67',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.MICROBE, 2).asterix().nbsp.resource(CardResource.DATA, 2).asterix();
        }),
        description: 'Add 2 microbes to any card. Add 2 data to any card.',
      },
    });
  }
}
