import {Space} from '../boards/Space';
import {DeferredAction} from '../deferredActions/DeferredAction';
import {Priority} from '../deferredActions/Priority';
import {SelectSpace} from '../inputs/SelectSpace';
import {IPlayer} from '../IPlayer';
import {PlayerInput} from '../PlayerInput';
import {VenusPhase2Data} from './VenusPhase2Data';
import {VenusPhase2Expansion} from './VenusPhase2Expansion';

export abstract class BasePlaceVenusPhase2Tile extends DeferredAction<Space> {
  constructor(
    player: IPlayer,
    public spaces?: Array<Space>,
    public title: string = 'Select a space for a tile',
  ) {
    super(player, Priority.DEFAULT);
  }

  protected abstract getSpaces(data: VenusPhase2Data): ReadonlyArray<Space>;
  protected abstract placeTile(space: Space): PlayerInput | undefined;

  public execute() {
    const spaces = this.spaces !== undefined ? this.spaces : this.getSpaces(VenusPhase2Expansion.venusPhase2Data(this.player.game));

    if (spaces.length === 0) {
      return undefined;
    }
    return new SelectSpace(this.title, spaces)
      .andThen((space) => {
        this.placeTile(space);
        this.cb(space);
        return undefined;
      });
  }
}
