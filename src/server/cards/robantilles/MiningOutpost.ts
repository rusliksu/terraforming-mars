import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MiningOutpost extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MINING_OUTPOST,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 20,

      behavior: {
        production: {energy: -1, titanium: 1},
        city: {},
      },

      metadata: {
        cardNumber: 'H63',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().energy(1).br;
            pb.plus().titanium(1);
          }).br;
          b.city();
        }),
        description: 'Decrease your energy production 1 step and increase your titanium production 1 step. Place a city tile.',
      },
    });
  }
}
