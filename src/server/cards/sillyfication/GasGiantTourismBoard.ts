import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {IProjectCard} from '../IProjectCard';

export class GasGiantTourismBoard extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GAS_GIANT_TOURISM_BOARD,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 20,
      victoryPoints: 1,

      action: {
        stock: {megacredits: {tag: Tag.JOVIAN}},
      },

      metadata: {
        cardNumber: 'X15',
        renderData: CardRenderer.builder((b) => {
          b.action('Gain 1 M€ for each Jovian tag you have.', (eb) => {
            eb.empty().startAction.megacredits(1).slash().tag(Tag.JOVIAN);
          });
        }),
      },
    });
  }
}
