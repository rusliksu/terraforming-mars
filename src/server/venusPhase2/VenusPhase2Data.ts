import {Board} from '../boards/Board';
import {IPlayer} from '../IPlayer';
import {VenusSurfaceBoard} from './VenusSurfaceBoard';
import {SerializedVenusPhase2Data} from './SerializedVenusPhase2Data';

export type VenusPhase2Data = {
  venusSurface: VenusSurfaceBoard;
}

export namespace VenusPhase2Data {
  export function serialize(data: VenusPhase2Data | undefined): SerializedVenusPhase2Data | undefined {
    if (data === undefined) {
      return undefined;
    }
    return {
      venusSurface: data.venusSurface.serialize(),
    };
  }

  export function deserialize(data: SerializedVenusPhase2Data, players: Array<IPlayer>): VenusPhase2Data {
    const spaces = Board.deserialize(data.venusSurface, players).spaces;
    return {
      venusSurface: new VenusSurfaceBoard(spaces),
    };
  }
}
