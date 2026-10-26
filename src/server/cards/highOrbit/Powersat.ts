import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {SilverActionCard} from './SilverActionCard';

/**
 * High Orbit (fan): Powersat. Action: spend 2 titanium to increase energy production 1 step.
 */
export class Powersat extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.POWERSAT,
      cost: 1,

      action: {
        spend: {titanium: 2},
        production: {energy: 1},
      },

      metadata: {
        cardNumber: 'HO05',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 titanium to increase your energy production 1 step.', (eb) => {
            eb.titanium(2).startAction.production((pb) => pb.energy(1));
          });
        }),
      },
    });
  }
}
