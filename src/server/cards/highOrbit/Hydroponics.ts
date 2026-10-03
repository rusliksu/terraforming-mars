import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {SilverActionCard} from './SilverActionCard';

/**
 * High Orbit (fan): Hydroponics. Action: spend 1 energy to gain 2 plants.
 */
export class Hydroponics extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.HYDROPONICS,
      cost: 4,

      action: {
        spend: {energy: 1},
        stock: {plants: 2},
      },

      metadata: {
        cardNumber: 'HO03',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 energy to gain 2 plants.', (eb) => {
            eb.energy(1).startAction.plants(2);
          });
        }),
      },
    });
  }
}
