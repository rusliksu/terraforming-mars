import {PlayerViewModel} from '@/common/models/PlayerModel';

/** Identifies a pending request with its current constraints, excluding the ticking player clock. */
export function inputContext(view: PlayerViewModel | undefined): string | undefined {
  if (view?.waitingForId === undefined || view.waitingFor === undefined) {
    return undefined;
  }
  return JSON.stringify([
    view.game.gameId, view.id, view.runId, view.game.phase, view.game.generation, view.game.undoCount, view.waitingForId,
    view.waitingFor, {...view.thisPlayer, timer: undefined},
  ]);
}
