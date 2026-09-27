import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class DebrisField extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.DEBRIS_FIELD,
      tags: [Tag.SPACE],
      cost: 5,

      behavior: {
        removeAnyPlants: 3,
        stock: {titanium: 1, steel: 1},
      },

      metadata: {
        cardNumber: 'X30',
        renderData: CardRenderer.builder((b) => {
          b.minus().plants(-3, {all}).br;
          b.titanium(1).steel(1);
        }),
        description: 'Remove up to 3 plants from any player. Gain 1 titanium and 1 steel.',
      },
    });
  }
}
