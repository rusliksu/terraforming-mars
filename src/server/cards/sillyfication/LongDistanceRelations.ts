import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';

export class LongDistanceRelations extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.LONG_DISTANCE_RELATIONS,
      tags: [Tag.EARTH, Tag.JOVIAN, Tag.SPACE],
      cost: 15,
      victoryPoints: 1,

      behavior: {
        production: {megacredits: {tag: Tag.JOVIAN}},
      },

      metadata: {
        cardNumber: 'X21',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1).slash().tag(Tag.JOVIAN));
        }),
        description: 'Increase your M€ production 1 step for each Jovian tag you have, including this.',
      },
    });
  }
}
