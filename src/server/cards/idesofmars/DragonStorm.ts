import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class DragonStorm extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.DRAGON_STORM,
      tags: [Tag.POWER, Tag.JOVIAN],
      cost: 24,
      victoryPoints: 1,

      action: {
        spend: {energy: 1},
        production: {energy: 1},
      },

      metadata: {
        cardNumber: '137',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 energy to increase your energy production 1 step.', (eb) => {
            eb.energy(1).startAction.production((pb) => pb.energy(1));
          });
        }),
      },
    });
  }
}
