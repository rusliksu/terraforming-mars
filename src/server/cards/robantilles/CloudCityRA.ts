import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {SpaceName} from '../../../common/boards/SpaceName';
import {CardRenderer} from '../render/CardRenderer';
import {questionmark} from '../render/DynamicVictoryPoints';

/**
 * Counts qualifying CARDS (not resource units): 1 VP per card this player owns with at
 * least 1 floater on it. No existing `CountableVictoryPoints` shape expresses this, so it's
 * a bespoke `getVictoryPoints` override.
 */
export class CloudCityRA extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.CLOUD_CITY_RA,
      tags: [Tag.VENUS, Tag.CITY, Tag.POWER],
      cost: 24,

      requirements: {venus: 12},
      victoryPoints: 'special',

      action: {
        addResourcesToAnyCard: [
          {count: 1, type: CardResource.FLOATER},
          {count: 1, type: CardResource.FLOATER},
        ],
      },

      behavior: {
        city: {space: SpaceName.CLOUD_CITY_RA},
      },

      metadata: {
        cardNumber: 'H19',
        renderData: CardRenderer.builder((b) => {
          b.action('Add up to 2 floaters to any number of cards.', (eb) => {
            eb.empty().startAction.resource(CardResource.FLOATER, {amount: 2});
          }).br;
          b.city().asterix();
          b.br;
          b.vpText('1 VP for each card you own with at least 1 floater on it.');
        }),
        victoryPoints: questionmark(),
        description: 'Requires Venus 12%. Place a city tile ON THE RESERVED AREA.',
      },
    });
  }

  public override getVictoryPoints(player: IPlayer): number {
    let count = 0;
    for (const card of player.tableau) {
      if (card.resourceType === CardResource.FLOATER && card.resourceCount >= 1) {
        count++;
      }
    }
    return count;
  }
}
