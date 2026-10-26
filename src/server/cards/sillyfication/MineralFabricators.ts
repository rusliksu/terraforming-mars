import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MineralFabricators extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MINERAL_FABRICATORS,
      tags: [Tag.BUILDING],
      cost: 7,

      behavior: {
        production: {energy: -1, steel: 1, titanium: 1},
      },

      metadata: {
        cardNumber: 'X28',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().energy(1).nbsp.plus().steel(1).titanium(1));
        }),
        description: 'Decrease your energy production 1 step. Increase your steel production and your titanium production 1 step each.',
      },
    });
  }
}
