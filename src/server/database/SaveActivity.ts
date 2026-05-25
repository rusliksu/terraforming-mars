const ISOLATED_SAVE_GAP_MS = 18 * 60 * 60 * 1000;

export function chooseLastMeaningfulSaveTimeMs(descendingSaveTimesMs: Array<number>): number | undefined {
  const [latest, previous] = descendingSaveTimesMs;
  if (!Number.isFinite(latest)) {
    return undefined;
  }
  if (Number.isFinite(previous) && latest - previous > ISOLATED_SAVE_GAP_MS) {
    return previous;
  }
  return latest;
}
