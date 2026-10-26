import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {SilverActionCard} from './SilverActionCard';

/**
 * High Orbit (fan): Space Habitat. Action: spend 1 titanium to increase M€ production 1 step.
 */
export class SpaceHabitat extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SPACE_HABITAT,
      cost: 4,

      action: {
        spend: {titanium: 1},
        production: {megacredits: 1},
      },

      metadata: {
        cardNumber: 'HO07',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 titanium to increase your M€ production 1 step.', (eb) => {
            eb.titanium(1).startAction.production((pb) => pb.megacredits(1));
          });
        }),
      },
    });
  }
}
