import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

export class GiantIndustrialComplex extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 24,
      tags: [Tag.BUILDING],
      name: CardName.GIANT_INDUSTRIAL_COMPLEX,
      type: CardType.AUTOMATED,

      requirements: {party: PartyName.MARS},

      behavior: {
        production: {steel: 1, titanium: 1, energy: 1, heat: 1},
      },

      metadata: {
        cardNumber: 'SOL25',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.steel(1).titanium(1).energy(1).heat(1);
          });
        }),
        description: 'Requires that Mars First is ruling or that you have 2 delegates there. ' +
          'Increase your Steel, Titanium, Energy, and Heat production 1 step each.',
      },
    });
  }
}
