import {IGame} from '../IGame';
import {SpaceId} from '../../common/Types';

// Printed map coordinate of a space (e.g. 'D7'). The board classes in this fork do not carry
// the upstream coordinate-label table yet, so fall back to the space id (still readable in logs).
export function spaceName(game: IGame, id: SpaceId): string {
  const labels = (game.board as unknown as {A9?: Readonly<Partial<Record<SpaceId, string>>>}).A9;
  return labels?.[id] ?? id;
}
