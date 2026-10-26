import {Size} from '../../../common/cards/render/Size';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class PatentPooling extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PATENT_POOLING,
      tags: [Tag.SCIENCE],
      cost: 10,

      action: {
        drawCard: {count: 1, pay: true},
      },

      metadata: {
        cardNumber: 'Im123',
        renderData: CardRenderer.builder((b) => {
          b.action('Look at the top card and either buy it or discard it', (eb) => eb.empty().startAction.text('?', {size: Size.SMALL}).cards(1));
        }),
      },
    });
  }
}
