import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SilverActionCard} from './SilverActionCard';

export class SpaceTradingStation extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SPACE_TRADING_STATION,
      cost: 3,

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Spend 2 titanium to gain 7 M€',
              spend: {titanium: 2},
              stock: {megacredits: 7},
            },
            {
              title: 'Spend 5 M€ to gain 2 titanium',
              spend: {megacredits: 5},
              stock: {titanium: 2},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'HO01',
        renderData: CardRenderer.builder((b) => {
          b.titanium(2).arrow().megacredits(7).nbsp.or().br;
          b.megacredits(5).arrow().titanium(2).br;
          b.plainText('Action: Spend 2 titanium to gain 7 M€, or spend 5 M€ to gain 2 titanium.', /* parens */ true);
        }),
      },
    });
  }
}
