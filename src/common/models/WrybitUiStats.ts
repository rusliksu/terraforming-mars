// Public read-only projection for the optional Wrybit statistics page.
// Only fields that are already public in the ELO history are allowed here. Do not add
// participant IDs, session data, e-mail addresses or other account fields.

export type WrybitUiStatsResult = {
  displayName: string;
  place: number;
  victoryPoints: number;
  corporation?: string;
  eloBefore?: number;
  eloAfter?: number;
  eloDelta?: number;
};

export type WrybitUiStatsGame = {
  id: string;
  date?: string;
  map?: string;
  generations: number;
  playerCount: number;
  durationMinutes?: number;
  results: ReadonlyArray<WrybitUiStatsResult>;
};

export type WrybitUiStatsSnapshot = {
  projectionVersion: 1;
  source: 'elo';
  games: ReadonlyArray<WrybitUiStatsGame>;
};

const EMPTY: WrybitUiStatsSnapshot = {projectionVersion: 1, source: 'elo', games: []};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function projectResult(value: unknown): WrybitUiStatsResult | undefined {
  const raw = record(value);
  if (raw === undefined) {
    return undefined;
  }
  const displayName = nonEmptyString(raw.displayName) ?? nonEmptyString(raw.name);
  const place = finiteNumber(raw.place);
  const victoryPoints = finiteNumber(raw.vp);
  if (displayName === undefined || place === undefined || victoryPoints === undefined) {
    return undefined;
  }
  const result: WrybitUiStatsResult = {displayName, place, victoryPoints};
  const corporation = nonEmptyString(raw.corp);
  if (corporation !== undefined) {
    result.corporation = corporation;
  }
  for (const [target, source] of [['eloBefore', 'oldElo'], ['eloAfter', 'newElo'], ['eloDelta', 'delta']] as const) {
    const value = finiteNumber(raw[source]);
    if (value !== undefined) {
      result[target] = value;
    }
  }
  return result;
}

function projectGame(value: unknown): WrybitUiStatsGame | undefined {
  const raw = record(value);
  if (raw === undefined) {
    return undefined;
  }
  const id = nonEmptyString(raw.gameId) ?? nonEmptyString(raw.id);
  const generations = finiteNumber(raw.generation);
  if (id === undefined || generations === undefined || generations < 0) {
    return undefined;
  }
  const rawResults = Array.isArray(raw.results) ? raw.results : [];
  const results = rawResults.map(projectResult)
    .filter((result): result is WrybitUiStatsResult => result !== undefined)
    .sort((a, b) => a.place - b.place);
  if (results.length === 0) {
    return undefined;
  }
  const game: WrybitUiStatsGame = {
    id,
    generations,
    playerCount: finiteNumber(raw.playerCount) ?? results.length,
    results,
  };
  const date = nonEmptyString(raw.date);
  if (date !== undefined) {
    game.date = date;
  }
  const map = nonEmptyString(raw.map);
  if (map !== undefined) {
    game.map = map;
  }
  const durationMinutes = finiteNumber(raw.durationMinutes);
  if (durationMinutes !== undefined && durationMinutes >= 0) {
    game.durationMinutes = Math.round(durationMinutes);
  }
  return game;
}

/** Convert the public ELO history into the narrow stats contract. Unknown/invalid games are omitted. */
export function projectWrybitUiStats(input: unknown): WrybitUiStatsSnapshot {
  const raw = record(input);
  if (raw === undefined || !Array.isArray(raw.games)) {
    return EMPTY;
  }
  const games = raw.games.map(projectGame)
    .filter((game): game is WrybitUiStatsGame => game !== undefined);
  return {projectionVersion: 1, source: 'elo', games};
}
