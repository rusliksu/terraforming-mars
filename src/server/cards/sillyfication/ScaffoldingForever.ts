import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ScaffoldingForever extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SCAFFOLDING_FOREVER,
      tags: [Tag.BUILDING],
      cost: 9,

      behavior: {
        production: {steel: {tag: Tag.BUILDING, per: 3}},
      },

      metadata: {
        cardNumber: 'X26',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.steel(1).slash().tag(Tag.BUILDING, 3));
        }),
        description: 'Increase your steel production 1 step for every 3 building tags you have, including this.',
      },
    });
  }
}
