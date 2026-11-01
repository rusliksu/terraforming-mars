import type {SpectatorModel} from '@/common/models/SpectatorModel';

/**
 * Spectator pages poll the server every second. The serialized model is large and may be
 * rebuilt even when nothing happened; replacing it re-renders the board, table and log.
 * Only a real game/turn change needs a new model. Per-player clocks tick locally.
 */
export function shouldReplaceSpectator(previous: SpectatorModel | undefined, next: SpectatorModel): boolean {
  if (previous === undefined) {
    return true;
  }
  const before = previous.game;
  const after = next.game;
  return before.gameId !== after.gameId ||
    before.inputSeq !== after.inputSeq ||
    before.undoCount !== after.undoCount ||
    before.phase !== after.phase ||
    before.generation !== after.generation ||
    before.step !== after.step;
}
