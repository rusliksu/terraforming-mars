import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

export class EnergyAcquisition extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 1,
      tags: [],
      name: CardName.ENERGY_ACQUISITION,
      type: CardType.EVENT,

      requirements: {party: PartyName.EMPOWER},

      behavior: {
        stock: {energy: 6},
      },

      metadata: {
        cardNumber: 'SOL30',
        renderData: CardRenderer.builder((b) => {
          b.energy(6);
        }),
        description: 'Requires that Empower is ruling or that you have 2 delegates there. Gain 6 Energy.',
      },
    });
  }
}
