import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class SupernovaExplosion extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SUPERNOVA_EXPLOSION,
      tags: [Tag.SPACE],
      cost: 22,

      behavior: {
        global: {temperature: 1},
        stock: {energy: 5, heat: 5},
        removeAnyPlants: 4,
      },

      metadata: {
        cardNumber: 'H43',
        renderData: CardRenderer.builder((b) => {
          b.temperature(1).br;
          b.energy(5, {digit: true}).heat(5, {digit: true}).br;
          b.minus().plants(-4, {all});
        }),
        description: 'Raise temperature 1 step and gain 5 energy and 5 heat. Remove up to 4 plants from any player.',
      },
    });
  }
}
