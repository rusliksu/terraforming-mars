import {IGame} from '../IGame';
import {Tile} from '../Tile';
import {VenusSurfaceBoard} from './VenusSurfaceBoard';
import {IPlayer} from '../IPlayer';
import {TileType} from '../../common/TileType';
import {VenusPhase2Data} from './VenusPhase2Data';
import {CardName} from '../../common/cards/CardName';
import {Space} from '../boards/Space';
import {Phase} from '../../common/Phase';
import {BoardType} from '../boards/BoardType';
import {VictoryPointsBreakdownBuilder} from '../game/VictoryPointsBreakdownBuilder';
import {SpaceId} from '../../common/Types';
import {Random} from '../../common/utils/Random';
import {GameOptions} from '../game/GameOptions';
import {Board} from '../boards/Board';
import {TurmoilHandler} from '../turmoil/TurmoilHandler';

export class VenusPhase2Expansion {
  public static readonly VENUS_PHASE_2_TILES: Set<TileType> = new Set([
    TileType.VENUS_CLOUD_CITY,
    TileType.VENUS_GAS_MINE,
    TileType.VENUS_FLOATER_ARRAY,
  ]);

  private constructor() {
  }

  // If Venus Phase 2 is enabled, execute this callback, otherwise do nothing.
  public static ifVenusPhase2<T>(game: IGame, cb: (data: VenusPhase2Data) => T): T | undefined {
    if (game.gameOptions.venusPhase2Expansion) {
      if (game.venusPhase2Data === undefined) {
        console.log(`Assertion failure: game.venusPhase2Data is undefined for ${game.id}`);
      } else {
        return cb(game.venusPhase2Data);
      }
    }
    return undefined;
  }

  // If Venus Phase 2 is enabled, return the game's VenusPhase2Data instance, otherwise throw.
  public static venusPhase2Data(game: IGame): VenusPhase2Data {
    if (game.gameOptions.venusPhase2Expansion === true && game.venusPhase2Data !== undefined) {
      return game.venusPhase2Data;
    }
    throw new Error('Assertion error: Using a Venus Phase 2 feature when the expansion is undefined.');
  }

  // "Cities in play" generically should include Cloud City (and Stratopolis/Maxwell Base's own
  // city tiles) on the Venus surface board -- the same way Moon's own tiles already fold into
  // similar cross-board totals elsewhere (see e.g. Landlord). Callers with a Mars-specific reason
  // to stay Mars-only (an explicit "on Mars" card, or an adjacency/geometry check that can't cross
  // boards) intentionally don't call this.
  public static getCitiesCount(game: IGame, player?: IPlayer): number {
    const data = game.venusPhase2Data;
    if (data === undefined) {
      return 0;
    }
    let cities = data.venusSurface.spaces.filter(Board.isCitySpace);
    if (player !== undefined) {
      cities = cities.filter(Board.ownedBy(player));
    }
    return cities.length;
  }

  // Same idea as getCitiesCount, but for any real tile (matching Landlord's "own the most tiles",
  // which already folds in Moon's spaces the same way).
  public static getRealTileCount(game: IGame, player: IPlayer): number {
    const data = game.venusPhase2Data;
    if (data === undefined) {
      return 0;
    }
    return data.venusSurface.spaces.filter(Board.hasRealTile).filter(Board.ownedBy(player)).length;
  }

  public static initialize(gameOptions: GameOptions, rng: Random): VenusPhase2Data {
    return {
      venusSurface: VenusSurfaceBoard.newInstance(gameOptions, rng),
    };
  }

  public static addCloudCityTile(player: IPlayer, spaceId: SpaceId, cardName: CardName | undefined = undefined): void {
    VenusPhase2Expansion.addTile(player, spaceId, {tileType: TileType.VENUS_CLOUD_CITY, card: cardName});
  }

  public static addGasMineTile(player: IPlayer, spaceId: SpaceId, cardName: CardName | undefined = undefined): void {
    VenusPhase2Expansion.addTile(player, spaceId, {tileType: TileType.VENUS_GAS_MINE, card: cardName});
  }

  public static addFloaterArrayTile(player: IPlayer, spaceId: SpaceId, cardName: CardName | undefined = undefined): void {
    VenusPhase2Expansion.addTile(player, spaceId, {tileType: TileType.VENUS_FLOATER_ARRAY, card: cardName});
  }

  public static addTile(player: IPlayer, spaceId: SpaceId, tile: Tile): void {
    const game = player.game;
    VenusPhase2Expansion.ifVenusPhase2(game, (data) => {
      const space = data.venusSurface.getSpaceOrThrow(spaceId);
      if (!this.VENUS_PHASE_2_TILES.has(tile.tileType)) {
        throw new Error(`Bad tile type for the Venus surface: ${tile.tileType}`);
      }
      if (space.tile !== undefined) {
        throw new Error('Selected space is occupied');
      }
      if (space.player !== undefined && space.player !== player) {
        throw new Error('This space is land claimed by ' + space.player.name);
      }

      space.tile = tile;
      if (game.phase !== Phase.SOLAR) {
        space.player = player;
      }

      if (game.phase !== Phase.SOLAR) {
        space.bonus.forEach((spaceBonus) => {
          game.grantSpaceBonus(player, spaceBonus);
        });
      }

      if (space.x !== -1 && space.y !== -1) {
        game.log('${0} placed a ${1} tile at ${2}', (b) => b.player(player).tileType(tile.tileType).space(space));
      }

      game.triggerForAllCards((p, c) => c.onTilePlaced?.(p, player, space, BoardType.VENUS));
    });
  }

  // Places Stratopolis'/MaxwellBase's reserved City tile on the Venus surface board (instead of
  // Mars) when Venus Phase 2 is enabled -- see Stratopolis.ts/MaxwellBase.ts's bespokePlay, which
  // uses the old Mars-board path when the expansion is off.
  public static addReservedCityTile(player: IPlayer, spaceId: SpaceId, cardName: CardName): void {
    const game = player.game;
    VenusPhase2Expansion.ifVenusPhase2(game, (data) => {
      const space = data.venusSurface.getSpaceOrThrow(spaceId);
      if (space.tile !== undefined) {
        throw new Error('Selected space is occupied');
      }
      space.tile = {tileType: TileType.CITY, card: cardName};
      space.player = player;
      game.triggerForAllCards((p, c) => c.onTilePlaced?.(p, player, space, BoardType.VENUS));
      TurmoilHandler.applyOnCityTilePlacedEffect(player);
    });
  }

  /*
   * Return the list of spaces on the Venus surface board with a given tile type.
   */
  public static spaces(game: IGame, tileType?: TileType, options?: {ownedBy?: IPlayer}): Array<Space> {
    if (game.venusPhase2Data === undefined) {
      return [];
    }
    return game.venusPhase2Data.venusSurface.spaces.filter((space) => {
      if (space.tile === undefined) {
        return false;
      }
      let include = true;
      if (tileType) {
        include = space.tile.tileType === tileType;
      }
      if (include && options?.ownedBy !== undefined) {
        include = Board.spaceOwnedBy(space, options.ownedBy);
      }
      return include;
    });
  }

  // A Gas Mine or Cloud City scores 1 VP per adjacent Floater Array -- mirroring the official
  // City/Greenery adjacency rule, and Moon's own mine/habitat-adjacent-to-road pattern. Floater
  // Array itself never scores directly.
  public static calculateVictoryPoints(player: IPlayer, builder: VictoryPointsBreakdownBuilder): void {
    VenusPhase2Expansion.ifVenusPhase2(player.game, (data) => {
      const venusSurface = data.venusSurface;
      const mySpaces = venusSurface.spaces.filter(Board.ownedBy(player));
      for (const space of mySpaces) {
        if (space.tile === undefined) {
          continue;
        }
        const type = space.tile.tileType;
        if (type !== TileType.VENUS_GAS_MINE && type !== TileType.VENUS_CLOUD_CITY) {
          continue;
        }
        const adjacentFloaterArrays = venusSurface.getAdjacentSpaces(space)
          .filter((adj) => adj.tile?.tileType === TileType.VENUS_FLOATER_ARRAY).length;
        builder.setVictoryPoints(type === TileType.VENUS_GAS_MINE ? 'venus gas mine' : 'venus cloud city', adjacentFloaterArrays);
      }
    });
  }
}
