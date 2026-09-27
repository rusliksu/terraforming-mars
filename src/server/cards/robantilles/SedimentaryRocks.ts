import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {TileType} from '../../../common/TileType';
import {SpaceBonus} from '../../../common/boards/SpaceBonus';
import {PlaceTile} from '../../deferredActions/PlaceTile';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {message} from '../../logs/MessageBuilder';
import {max} from '../Options';

/**
 * Places a new "Sediment" special tile (see TileType.SEDIMENT). Its owner may later place a City
 * tile directly over it -- from any source, not just this card -- ignoring both the "space must
 * be empty" and "no city adjacent to a city" rules. See MarsBoard.canCover and
 * MarsBoard.getAvailableSpacesForCity for the placement side of that, and Game.addTile for the
 * 3 M€ reward on the cover.
 */
export class SedimentaryRocks extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SEDIMENTARY_ROCKS,
      tags: [Tag.BUILDING],
      cost: 5,

      requirements: {cities: 3, max},
      adjacencyBonus: {bonus: [SpaceBonus.TITANIUM]},

      metadata: {
        cardNumber: 'H57',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.SEDIMENT).asterix();
          b.br;
          b.text(
            'Place the Special Sediment tile. You can place a City tile over this tile, ignoring the normal ' +
            'placement rules. Get 3 M€ when you place a City tile above Sediment. Adjacency bonus: 1 titanium.',
            {size: Size.SMALL});
        }),
        description: 'Requires a maximum of 3 cities on Mars.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.availableSpaces(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(
      new PlaceTile(player, {
        tile: {tileType: TileType.SEDIMENT, card: this.name},
        on: () => this.availableSpaces(player),
        title: message('Select space for ${0}', (b) => b.card(this)),
        adjacencyBonus: this.adjacencyBonus,
      }));
    return undefined;
  }

  private availableSpaces(player: IPlayer) {
    return player.game.board.getAvailableSpacesOnLand(player).filter((space) => space.tile === undefined);
  }
}
