import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';

export class InSituResourceUtilization extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.IN_SITU_RESOURCE_UTILIZATION,
      cost: 9,

      action: {
        removeResourcesFromAnyCard: {type: CardResource.ORE, count: 3, source: 'self'},
      },

      metadata: {
        cardNumber: 'V56',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Action: spend 3 ore resources from anywhere to trade with a colony.', true);
        }),
      },
    });
  }

  public override bespokeAction(player: IPlayer) {
    player.defer(() => player.colonies.coloniesTradeAction());
    return undefined;
  }
}
