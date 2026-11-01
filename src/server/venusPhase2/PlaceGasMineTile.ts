import {TileType} from '../../common/TileType';
import {Space} from '../boards/Space';
import {IPlayer} from '../IPlayer';
import {BasePlaceVenusPhase2Tile} from './BasePlaceVenusPhase2Tile';
import {VenusPhase2Data} from './VenusPhase2Data';
import {VenusPhase2Expansion} from './VenusPhase2Expansion';

export class PlaceGasMineTile extends BasePlaceVenusPhase2Tile {
  protected override readonly tileType = TileType.VENUS_GAS_MINE;

  constructor(
    player: IPlayer,
    spaces?: Array<Space>,
    title: string = 'Select a gaslight space on the Venus surface for a Gas Mine.',
  ) {
    super(player, spaces, title);
  }

  protected getSpaces(data: VenusPhase2Data) {
    return data.venusSurface.getAvailableSpacesForGaslight(this.player);
  }

  public placeTile(space: Space) {
    VenusPhase2Expansion.addGasMineTile(this.player, space.id);
    return undefined;
  }
}
