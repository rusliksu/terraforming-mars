import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

export class TerraformingOffice extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.TERRAFORMING_OFFICE,
      tags: [],
      cost: 5,

      requirements: {party: PartyName.BUREAUCRATS},

      metadata: {
        cardNumber: '130',
        renderData: CardRenderer.builder((b) => {
          b.action('Once per generation, take another action.', (eb) => eb.empty().startAction.text('ACTION'));
        }),
        description: 'Requires that the Bureaucrats are ruling or that you have 2 delegates there.',
      },
    });
  }

  public canAct(_player: IPlayer): boolean {
    return true;
  }

  public action(player: IPlayer) {
    player.availableActionsThisRound += 1;
    player.game.log('${0} used ${1} to take another action', (b) => b.player(player).card(this));
    return undefined;
  }
}
