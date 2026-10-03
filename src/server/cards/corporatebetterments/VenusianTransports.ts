import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class VenusianTransports extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_TRANSPORTS,
      tags: [Tag.VENUS, Tag.SPACE],
      cost: 22,

      victoryPoints: 1,
      requirements: {venus: 12},

      action: {
        stock: {megacredits: {tag: Tag.VENUS}},
      },

      metadata: {
        cardNumber: 'CB32',
        renderData: CardRenderer.builder((b) => {
          b.action('Gain 1 M€ for each Venus tag you have.', (eb) => {
            eb.empty().startAction.megacredits(1).slash().tag(Tag.VENUS);
          });
        }),
        description: 'Requires Venus 12%.',
      },
    });
  }
}
