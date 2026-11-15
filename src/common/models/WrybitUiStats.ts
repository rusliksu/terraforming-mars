// Public read-only projection for the optional Wrybit statistics page.
// Only fields that are already public in the ELO history are allowed here. Do not add
// participant IDs, session data, e-mail addresses or other account fields.

import {isNonHumanPlayerName, isSyntheticPlayerLineup} from '../elo/playerKind';

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

/** One row of the public rating table (the same numbers the ELO page shows). */
export type WrybitUiStatsRating = {
  displayName: string;
  elo: number;
  games: number;
  wins: number;
  top3?: number;
  averageVictoryPoints?: number;
};

export type WrybitUiStatsSnapshot = {
  projectionVersion: 1;
  source: 'elo';
  games: ReadonlyArray<WrybitUiStatsGame>;
  ratings: ReadonlyArray<WrybitUiStatsRating>;
};

const EMPTY: WrybitUiStatsSnapshot = {projectionVersion: 1, source: 'elo', games: [], ratings: []};

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
  // Older stored games only carry the internal key, which is the same public game id.
  const id = nonEmptyString(raw.gameId) ?? nonEmptyString(raw.id) ?? nonEmptyString(raw._key);
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
  // Bot games and benchmark line-ups ("a"/"b"/"c") are not public results: they would turn the
  // statistics into a list of automated accounts instead of our players.
  if (results.some((result) => isNonHumanPlayerName(result.displayName)) ||
    isSyntheticPlayerLineup(results.map((result) => result.displayName))) {
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

function projectRating(value: unknown): WrybitUiStatsRating | undefined {
  const raw = record(value);
  if (raw === undefined) {
    return undefined;
  }
  const displayName = nonEmptyString(raw.displayName);
  const elo = finiteNumber(raw.elo);
  const games = finiteNumber(raw.games);
  if (displayName === undefined || elo === undefined || games === undefined || games < 1) {
    return undefined;
  }
  if (isNonHumanPlayerName(displayName)) {
    return undefined;
  }
  const rating: WrybitUiStatsRating = {
    displayName,
    elo: Math.round(elo),
    games: Math.round(games),
    wins: Math.round(finiteNumber(raw.wins) ?? 0),
  };
  const top3 = finiteNumber(raw.top3);
  if (top3 !== undefined) {
    rating.top3 = Math.round(top3);
  }
  const averageVp = finiteNumber(raw.avgVP);
  if (averageVp !== undefined) {
    rating.averageVictoryPoints = Math.round(averageVp * 10) / 10;
  }
  return rating;
}

function projectRatings(input: unknown): Array<WrybitUiStatsRating> {
  const raw = record(input);
  if (raw === undefined) {
    return [];
  }
  const ratings: Array<WrybitUiStatsRating> = [];
  for (const [key, value] of Object.entries(raw)) {
    if (isNonHumanPlayerName(key)) {
      continue;
    }
    const rating = projectRating(value);
    if (rating !== undefined) {
      ratings.push(rating);
    }
  }
  return ratings.sort((first, second) => second.elo - first.elo || first.displayName.localeCompare(second.displayName));
}

/** Convert the public ELO history into the narrow stats contract. Unknown/invalid games are omitted. */
export function projectWrybitUiStats(input: unknown): WrybitUiStatsSnapshot {
  const raw = record(input);
  if (raw === undefined || !Array.isArray(raw.games)) {
    return EMPTY;
  }
  const games = raw.games.map(projectGame)
    .filter((game): game is WrybitUiStatsGame => game !== undefined);
  return {projectionVersion: 1, source: 'elo', games, ratings: projectRatings(raw.players)};
}
