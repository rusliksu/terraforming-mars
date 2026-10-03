import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {TileType} from '../../../common/TileType';
import {CardRenderer} from '../render/CardRenderer';

export class InsectPollinators extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.INSECT_POLLINATORS,
      tags: [Tag.MICROBE],
      cost: 8,

      requirements: {oxygen: 4},

      metadata: {
        cardNumber: 'Im117',
        renderData: CardRenderer.builder((b) => {
          b.effect('Placing a greenery next to one of your other greeneries costs 1 plant less.', (eb) => {
            eb.greenery().startEffect.plants(-1);
          });
        }),
        description: 'Requires at least 4% oxygen.',
      },
    });
  }

  /**
   * Called from ConvertPlants (the standard "convert plants into a greenery" action) to see
   * whether the acting player gets Insect Pollinators' discount for placing a greenery at
   * `space`. Mirrors the Aerotech/SpireTech hook pattern of a static method a core mechanic
   * calls into, so this fan card doesn't need a bespoke standard project of its own.
   */
  public static getDiscount(player: IPlayer, space: Space): number {
    if (player.tableau.get(CardName.INSECT_POLLINATORS) === undefined) {
      return 0;
    }
    const board = player.game.board;
    const adjacentToOwnGreenery = board.getAdjacentSpaces(space)
      .some((adjacent) => adjacent.tile?.tileType === TileType.GREENERY && adjacent.player === player);
    return adjacentToOwnGreenery ? 1 : 0;
  }
}
