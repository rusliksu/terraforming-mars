import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PartyName} from '../../../common/turmoil/PartyName';

export class WasteIncinerator extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.WASTE_INCINERATOR,
      tags: [Tag.BUILDING],
      cost: 11,

      requirements: {party: PartyName.KELVINISTS},

      behavior: {
        production: {heat: 3},
      },

      metadata: {
        cardNumber: 'SOL18',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.heat(3));
        }),
        description: 'Requires that Kelvinists are ruling or that you have 2 delegates there. Increase your heat production 3 steps.',
      },
    });
  }
}
