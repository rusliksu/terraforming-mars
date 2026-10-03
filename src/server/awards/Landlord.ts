import {IAward} from './IAward';
import {IPlayer} from '../IPlayer';
import {TileType} from '../../common/TileType';
import {Board} from '../boards/Board';
import {VenusPhase2Expansion} from '../venusPhase2/VenusPhase2Expansion';

export class Landlord implements IAward {
  public readonly name = 'Landlord';
  public readonly description = 'Own the most tiles';
  public getScore(player: IPlayer): number {
    const marsSpaceCount = player.game.board.spaces
      .filter(Board.hasRealTile)
      .filter(Board.ownedBy(player))
      .filter((space) =>
        // Don't simplifiy this to "space.tile?.tileType !== TileType.OCEAN" because that will make
        // Land Claim a valid space for Landlord.
        space.tile?.tileType !== TileType.OCEAN && space.player === player).length;

    const moonSpaces = player.game.moonData?.moon.spaces ?? [];
    const moonSpaceCount = moonSpaces
      .filter(Board.hasRealTile)
      .filter(Board.ownedBy(player)).length;

    const venusSpaceCount = VenusPhase2Expansion.getRealTileCount(player.game, player);

    return marsSpaceCount + moonSpaceCount + venusSpaceCount;
  }
}
