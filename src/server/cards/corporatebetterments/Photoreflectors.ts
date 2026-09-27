import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class Photoreflectors extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PHOTOREFLECTORS,
      tags: [Tag.POWER, Tag.SPACE],
      cost: 18,

      victoryPoints: 1,

      action: {
        spend: {energy: 4},
        tr: 1,
      },

      metadata: {
        cardNumber: 'CB29',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 4 energy to raise your TR 1 step.', (eb) => {
            eb.energy(4, {digit}).startAction.tr(1);
          });
        }),
      },
    });
  }
}
