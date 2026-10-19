import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class AlgorithmicTrading extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ALGORITHMIC_TRADING,
      tags: [Tag.SCIENCE, Tag.EARTH],
      cost: 20,
      victoryPoints: 2,

      requirements: {tag: Tag.SCIENCE},

      behavior: {
        production: {megacredits: 1},
      },

      action: {
        spend: {megacredits: 8},
        production: {megacredits: 2},
      },

      metadata: {
        cardNumber: 'H61',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 8 M€ to increase your M€ production 2 steps.', (eb) => {
            eb.megacredits(8).startAction.production((pb) => pb.megacredits(2));
          }).br;
          b.production((pb) => pb.megacredits(1));
        }),
        description: 'Requires that you have a Science tag. Increase your M€ production 1 step.',
      },
    });
  }
}
