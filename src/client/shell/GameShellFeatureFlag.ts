export const BROWSER_ENGINE_V2_FLAG = 'tm.browserEngineV2';

export interface FlagStorage {
  getItem(key: string): string | null;
}

let testOverride: boolean | undefined = undefined;

/**
 * Feature flag for the browser-engine/shell path. The default is off: with no
 * explicit flag the current Vue flow is left untouched. Only the flag itself
 * may live in localStorage; the authorized PlayerViewModel never does.
 */
export function isBrowserEngineV2Enabled(storage?: FlagStorage): boolean {
  // An explicitly supplied storage is authoritative (and easy to test).
  if (storage !== undefined) {
    return storage.getItem(BROWSER_ENGINE_V2_FLAG) === '1';
  }
  if (testOverride !== undefined) {
    return testOverride;
  }
  return typeof localStorage !== 'undefined' && localStorage.getItem(BROWSER_ENGINE_V2_FLAG) === '1';
}

/** Alias used by the root shell integration. */
export function isGameShellEnabled(): boolean {
  return isBrowserEngineV2Enabled();
}

/**
 * Test-only override. Pass undefined to restore the localStorage-backed
 * default. The override is in memory and is never written to storage.
 */
export function setGameShellEnabledForTest(enabled: boolean | undefined): void {
  testOverride = enabled;
}
