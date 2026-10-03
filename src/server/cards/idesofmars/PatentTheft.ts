import {ICard, IActionCard, isIActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CardRenderer} from '../render/CardRenderer';

/**
 * "Use an action from an active card an opponent owns" - modeled on the conglomerates
 * FacilitySharing mechanic (see src/server/cards/conglomerates/teamActions/FacilitySharing.ts),
 * which is the codebase's existing precedent for invoking `card.action(player)` on a card
 * owned by someone other than the acting player. The Loot resource is added unconditionally
 * as the fixed reward of taking the action, regardless of what the borrowed action itself does.
 */
export class PatentTheft extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PATENT_THEFT,
      tags: [Tag.EARTH],
      cost: 2,

      resourceType: CardResource.LOOT,
      victoryPoints: {resourcesHere: {}, each: -1, per: 2},

      metadata: {
        cardNumber: 'I05',
        renderData: CardRenderer.builder((b) => {
          b.action('Use an action on an active card an opponent owns.', (eb) => {
            eb.empty().startAction.resource(CardResource.LOOT);
          }).br;
          b.vpText('-1 VP for every 2 Loot resources on this card.');
        }),
        description: 'Adds a Loot resource to this card.',
      },
    });
  }

  private sharableCards(player: IPlayer): Array<{owner: IPlayer, card: ICard & IActionCard}> {
    const result: Array<{owner: IPlayer, card: ICard & IActionCard}> = [];
    for (const opponent of player.opponents) {
      for (const card of opponent.tableau) {
        if (card.type !== CardType.ACTIVE) {
          continue;
        }
        if (isIActionCard(card) && card.canAct(player)) {
          result.push({owner: opponent, card});
        }
      }
    }
    return result;
  }

  public canAct(player: IPlayer): boolean {
    return this.sharableCards(player).length > 0;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const targets = this.sharableCards(player);

    const options = targets.map(({owner, card}) => {
      return new SelectOption(card.name, 'Use').andThen(() => {
        const result = card.action(player);
        player.addResourceTo(this, {qty: 1, log: true});
        player.game.log('${0} used ${1}\'s ${2} through Patent Theft', (b) => b.player(player).player(owner).card(card));
        return result;
      });
    });

    return new OrOptions(...options).setTitle('Select an opponent\'s active card to use').reduce();
  }
}
