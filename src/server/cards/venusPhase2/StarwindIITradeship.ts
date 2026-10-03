import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {digit} from '../Options';

export class StarwindIITradeship extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.STARWIND_II_TRADESHIP,
      tags: [Tag.SPACE],
      cost: 16,
      victoryPoints: 1,

      behavior: {
        colonies: {
          addTradeFleet: 1,
        },
      },

      action: {
        spend: {heat: 3},
      },

      metadata: {
        cardNumber: 'V81',
        renderData: CardRenderer.builder((b) => {
          b.tradeFleet();
          b.br;
          b.action('Spend 3 heat to trade.', (eb) => {
            eb.heat(3, {digit}).startAction.trade();
          });
        }),
        description: 'Gain 1 trade fleet.',
      },
    });
  }

  public override bespokeAction(player: IPlayer) {
    player.defer(() => player.colonies.coloniesTradeAction());
    return undefined;
  }
}
