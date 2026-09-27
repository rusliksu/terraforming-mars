import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class IoThermalization extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.IO_THERMALIZATION,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 25,

      victoryPoints: 2,

      action: {
        or: {
          behaviors: [
            {
              title: 'Spend 1 titanium to increase your heat production 1 step',
              spend: {titanium: 1},
              production: {heat: 1},
            },
            {
              title: 'Decrease your heat production 2 steps to raise your TR 1 step',
              production: {heat: -2},
              tr: 1,
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'CB31',
        renderData: CardRenderer.builder((b) => {
          b.plainText(
            'Action: Spend 1 titanium to increase your heat production 1 step, ' +
            'or decrease your heat production 2 steps to raise your TR 1 step.', true);
        }),
      },
    });
  }
}
