/**
 * Finite persistence budget for a single game.
 *
 * A game normally needs far fewer saves than this. The hard ceiling prevents
 * an accidental or hostile runner from disabling the guard with an unlimited
 * value while keeping the limit configurable below that ceiling.
 */
export const DEFAULT_MAX_SAVES_PER_GAME = 2048;
export const ABSOLUTE_MAX_SAVES_PER_GAME = 4096;

export function resolveMaxSavesPerGame(value: unknown = process.env.TM_MAX_SAVES_PER_GAME): number {
  const candidate = value === undefined || value === null || value === ''
    ? DEFAULT_MAX_SAVES_PER_GAME
    : Number(value);
  if (!Number.isSafeInteger(candidate) || candidate <= 0 || candidate > ABSOLUTE_MAX_SAVES_PER_GAME) {
    const error = new Error(`TM_MAX_SAVES_PER_GAME must be an integer between 1 and ${ABSOLUTE_MAX_SAVES_PER_GAME}`);
    (error as Error & {code?: string}).code = 'HISTORY_LIMIT_CONFIG_INVALID';
    throw error;
  }
  return candidate;
}

export function assertSaveIdWithinLimit(saveId: number, maxSavesPerGame: number = resolveMaxSavesPerGame()): void {
  const limit = resolveMaxSavesPerGame(maxSavesPerGame);
  if (!Number.isSafeInteger(saveId) || saveId < 0) {
    const error = new Error(`invalid save id ${saveId}`);
    (error as Error & {code?: string}).code = 'HISTORY_SAVE_ID_INVALID';
    throw error;
  }
  if (saveId >= limit) {
    const error = new Error(`per-game history limit reached (${limit} saves)`);
    (error as Error & {code?: string}).code = 'HISTORY_LIMIT_EXCEEDED';
    throw error;
  }
}
