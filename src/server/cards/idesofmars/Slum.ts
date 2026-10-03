import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {max} from '../Options';

export class Slum extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SLUM,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 7,
      victoryPoints: -1,

      requirements: {cities: 4, max},

      behavior: {
        production: {energy: -1, megacredits: 1},
        city: {},
      },

      metadata: {
        cardNumber: 'I57',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(-1).megacredits(1)).city();
        }),
        description: 'Requires at max 4 cities on Mars. Decrease your energy production 1 step and increase your M€ production 1 step. Place a city tile.',
      },
    });
  }
}
