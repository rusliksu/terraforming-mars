import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class OrbitalSeedDispersal extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ORBITAL_SEED_DISPERSAL,
      tags: [Tag.PLANT, Tag.SPACE],
      cost: 12,

      behavior: {
        production: {plants: 1},
        stock: {plants: {tag: Tag.SPACE, per: 2}},
      },

      metadata: {
        cardNumber: 'X02',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1)).br;
          b.plants(1).slash().tag(Tag.SPACE, 2);
        }),
        description: 'Increase your plant production 1 step. Gain 1 plant for every 2 space tags you have, including this.',
      },
    });
  }
}
