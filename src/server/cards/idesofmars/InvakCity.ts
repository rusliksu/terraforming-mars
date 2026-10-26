import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {BoardType} from '../../boards/BoardType';
import {TileType} from '../../../common/TileType';
import {Resource} from '../../../common/Resource';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';

/**
 * "Substitute one of your Greeneries with the Special tile Invak City. Counts both as a City
 * and as a Greenery." Implemented as a new TileType.INVAK_CITY added to both CITY_TILES and
 * GREENERY_TILES in common/TileType.ts -- the same "counts as two things" pattern already used
 * for Ocean City/New Holland (ocean + city) and Wetlands (ocean + greenery).
 *
 * The substitution itself uses Game.simpleAddTile (not the normal addTile/PlaceTile path,
 * which is for placing onto EMPTY spaces and would re-charge Ares hazard-adjacency fees and
 * re-grant space/placement bonuses): this is swapping the type of a tile the player already
 * owns and already collected bonuses for, not a fresh placement.
 *
 * "Adjacency bonus 2 M€" is implemented directly on this card via onTilePlaced (mirroring how
 * Ecological Zone/base-game Ocean adjacency bonuses work), rather than the Ares-only
 * adjacencyBonus/space.adjacency mechanism, since this card has nothing to do with Ares and
 * must work in any game.
 */
export class InvakCity extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.INVAK_CITY,
      tags: [Tag.PLANT],
      cost: 21,
      victoryPoints: 1,

      behavior: {
        production: {energy: -1, megacredits: 3},
      },

      // Not placed via `behavior.tile` (bespokePlay substitutes an existing owned space instead
      // of placing on an empty one), so this is declared explicitly for anything that inspects
      // tilesBuilt generically (e.g. idesOfMars' Martian Infrastructures discount).
      tilesBuilt: [TileType.INVAK_CITY],

      requirements: {greeneries: 1},

      metadata: {
        cardNumber: 'IM136',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().energy(1).megacredits(3));
          b.br;
          b.effect('Substitute one of your greeneries with the Invak City tile. It counts as both ' +
            'a city and a greenery. Adjacency bonus 2 M€.', (eb) => {
            eb.greenery().startEffect.tile(TileType.INVAK_CITY, true);
          });
        }),
        description: 'Requires that you own a greenery. Decrease your energy production 1 step ' +
          'and increase your M€ production 3 steps.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getGreeneries(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const spaces = player.game.board.getGreeneries(player);
    return new SelectSpace('Select one of your greeneries to substitute with Invak City', spaces)
      .andThen((space) => {
        player.game.simpleAddTile(player, space, {tileType: TileType.INVAK_CITY, card: this.name});
        player.game.log('${0} substituted a greenery with the Invak City tile at ${1}', (b) => b.player(player).space(space));
        return undefined;
      });
  }

  public onTilePlaced(cardOwner: IPlayer, _activePlayer: IPlayer, space: Space, boardType: BoardType): void {
    if (boardType !== BoardType.MARS) {
      return;
    }
    const citySpace = cardOwner.game.board.getSpaceByTileCard(this.name);
    if (citySpace === undefined || citySpace.id === space.id) {
      return;
    }
    if (!cardOwner.game.board.getAdjacentSpaces(citySpace).includes(space)) {
      return;
    }
    cardOwner.stock.add(Resource.MEGACREDITS, 2);
    cardOwner.game.log('${0} gained 2 M€ from ${1}\'s adjacency bonus', (b) => b.player(cardOwner).card(this));
  }
}
