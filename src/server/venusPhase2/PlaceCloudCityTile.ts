import {Space} from '../boards/Space';
import {IPlayer} from '../IPlayer';
import {BasePlaceVenusPhase2Tile} from './BasePlaceVenusPhase2Tile';
import {VenusPhase2Data} from './VenusPhase2Data';
import {VenusPhase2Expansion} from './VenusPhase2Expansion';

// Despite the class/tile-type name, this is displayed as "Venus Habitat" (tileTypeToString) and
// matches the user's own source card art/text exactly -- "Cloud City" was this fan expansion's own
// invented name for its standard project, before the 45-card set (New Alexandria, New Athens, New
// Babylon, New Rome) confirmed they're all the same tile the user calls "Venus Habitat". Kept as
// TileType.VENUS_CLOUD_CITY internally (renaming a numeric enum value would silently reassign
// every later tile type's ordinal, corrupting already-serialized games) -- only the display string
// and card-facing text changed.
export class PlaceCloudCityTile extends BasePlaceVenusPhase2Tile {
  constructor(
    player: IPlayer,
    spaces?: Array<Space>,
    title: string = 'Select a space on the Venus surface for a Cloud City.',
  ) {
    super(player, spaces, title);
  }

  protected getSpaces(data: VenusPhase2Data) {
    return data.venusSurface.getAvailableSpacesForLand(this.player);
  }

  public placeTile(space: Space) {
    VenusPhase2Expansion.addCloudCityTile(this.player, space.id);
    return undefined;
  }
}
