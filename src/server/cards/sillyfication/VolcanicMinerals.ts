import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class VolcanicMinerals extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.VOLCANIC_MINERALS,
      cost: 3,

      // `spend` lives inside each `or` branch: a top-level `behavior.spend`
      // alongside `behavior.or` makes the executor run the `or` twice.
      behavior: {
        or: {
          behaviors: [
            {spend: {heat: 4}, stock: {titanium: 4}, title: 'Spend 4 heat to gain 4 titanium'},
            {spend: {heat: 4}, stock: {steel: 6}, title: 'Spend 4 heat to gain 6 steel'},
          ],
        },
      },

      metadata: {
        cardNumber: 'X04',
        renderData: CardRenderer.builder((b) => {
          b.minus().heat(4, {digit}).arrow().titanium(4, {digit}).or().steel(6, {digit});
        }),
        description: 'Spend 4 heat to gain either 4 titanium or 6 steel.',
      },
    });
  }
}
