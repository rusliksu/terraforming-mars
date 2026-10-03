import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class MacroMills extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MACRO_MILLS,
      cost: 10,

      behavior: {
        production: {heat: 2},
        stock: {heat: 3},
      },

      metadata: {
        cardNumber: 'X05',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.heat(2)).heat(3, {digit});
        }),
        description: 'Increase your heat production 2 steps. Gain 3 heat.',
      },
    });
  }
}
