import {isMarsSpace} from '@/common/boards/spaces';
import {SpaceId} from '@/common/Types';

// Scrolls the given space into view (falling back to its whole board -- Mars or Moon --
// if the space itself isn't found in the DOM). Scrolling to the exact space, rather than
// just centering the board's bounding box, matters once the board is much bigger than the
// viewport (a large custom map): centering the box can leave the actual clickable space well
// off-screen.
// Returns the board element scrolled to (or containing the space), or null if neither is
// present on this screen (e.g. no Moon board in this game).
export function scrollToSpace(spaceId: SpaceId): HTMLElement | null {
  const boardId = isMarsSpace(spaceId) ? 'shortkey-board' : 'shortkey-moonBoard';
  const board = document.getElementById(boardId);
  if (board === null) {
    return null;
  }
  const space = document.querySelector<HTMLElement>(`[data_space_id="${spaceId}"]`);
  (space ?? board).scrollIntoView({block: 'center', inline: 'center', behavior: 'smooth'});
  return board;
}
