import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

export class MartianAgriculture extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 42,
      tags: [Tag.SCIENCE, Tag.PLANT, Tag.BUILDING],
      name: CardName.MARTIAN_AGRICULTURE,
      type: CardType.AUTOMATED,

      requirements: {party: PartyName.SPOME},

      behavior: {
        production: {plants: 5},
        tr: 1,
      },

      metadata: {
        cardNumber: 'SOL26',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(5)).nbsp.tr(1);
        }),
        description: 'Requires that Spome is ruling or that you have 2 delegates there. ' +
          'Increase your Plant production 5 steps. Increase your TR 1 step.',
      },
    });
  }
}
