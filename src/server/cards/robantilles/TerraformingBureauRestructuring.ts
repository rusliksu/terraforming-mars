import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {ICard, IActionCard, isIActionCard} from '../ICard';
import {SelectCard} from '../../inputs/SelectCard';
import {SimpleDeferredAction} from '../../deferredActions/DeferredAction';
import {message} from '../../logs/MessageBuilder';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';

export class TerraformingBureauRestructuring extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.TERRAFORMING_BUREAU_RESTRUCTURING,
      tags: [],
      cost: 0,
      victoryPoints: -1,

      requirements: {party: PartyName.BUREAUCRATS},

      metadata: {
        cardNumber: 'H21',
        renderData: CardRenderer.builder((b) => {
          b.text('every opponent marks 2 active cards of your choice as used', {size: Size.SMALL, uppercase});
        }),
        // Printed card text has a typo, "Bureacrats"; the requirement itself is Bureaucrats.
        description: 'Requires that the Bureaucrats are ruling or that you have 2 delegates there.',
      },
    });
  }

  private eligibleCards(opponent: IPlayer): Array<IActionCard & ICard> {
    const result: Array<IActionCard & ICard> = [];
    for (const card of opponent.tableau) {
      if (!isIActionCard(card)) {
        continue;
      }
      if (opponent.actionsThisGeneration.has(card.name)) {
        continue;
      }
      if (!card.canAct(opponent)) {
        continue;
      }
      result.push(card);
    }
    return result;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    for (const opponent of player.opponents) {
      const eligible = this.eligibleCards(opponent);
      if (eligible.length === 0) {
        continue;
      }
      const count = Math.min(2, eligible.length);
      game.defer(new SimpleDeferredAction(player, () => {
        return new SelectCard(
          message('Select ${0} card(s) played by ${1} to mark as used', (b) => b.number(count).player(opponent)),
          'Mark as used',
          eligible,
          {min: count, max: count},
        ).andThen((cards) => {
          for (const card of cards) {
            opponent.actionsThisGeneration.add(card.name);
          }
          game.log('${0} marked ${1} card(s) played by ${2} as used this generation', (b) => b.player(player).number(count).player(opponent));
          return undefined;
        });
      }));
    }
    return undefined;
  }
}
