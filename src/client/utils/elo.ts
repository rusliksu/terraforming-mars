import {reactive} from 'vue';
import {Color} from '@/common/Color';
import {normalizeEloPlayerName} from '@/client/utils/normalizeEloPlayerName';

export type EloEntry = {
  elo?: number;
  games?: number;
  wins?: number;
  totalVP?: number;
  avgPlaceScore?: number;
  displayName?: string;
};

export type EloGameResult = {
  name?: string;
  displayName?: string;
  oldElo?: number;
  newElo?: number;
  delta?: number;
  vp?: number;
};

export type EloGame = {
  results?: Array<EloGameResult>;
};

export type EloResultRow = {
  name: string;
  color: Color;
  oldElo: number;
  newElo: number;
  delta: number;
  avgPlaceScore?: number;
};

export type EloState = {
  loaded: boolean;
  failed: boolean;
  players: Record<string, EloEntry>;
  games: Array<EloGame>;
};

type EloPlayerSummary = {
  name: string;
  color: Color;
  victoryPointsBreakdown: {
    total: number;
  };
};

const ELO_URLS = ['/elo/data.json', '/elo/elo-data.json'];

export const sharedEloState = reactive<EloState>({
  loaded: false,
  failed: false,
  players: {},
  games: [],
});

let sharedEloFetch: Promise<void> | null = null;

export function normalizeEloName(name: string): string {
  return normalizeEloPlayerName(name);
}

export function lookupEloEntry(players: Record<string, EloEntry>, playerName: string): EloEntry | null {
  if (!playerName) return null;
  const normalized = normalizeEloName(playerName);
  if (players[normalized]) return players[normalized];

  const playerNameLower = playerName.trim().toLowerCase();
  for (const key of Object.keys(players)) {
    const entry = players[key];
    if (entry.displayName && entry.displayName.trim().toLowerCase() === playerNameLower) {
      return entry;
    }
  }
  return null;
}

export async function ensureEloLoaded(): Promise<void> {
  if (sharedEloState.loaded || sharedEloState.failed) return;
  if (sharedEloFetch !== null) {
    await sharedEloFetch;
    return;
  }
  if (typeof fetch !== 'function') return;

  sharedEloFetch = (async () => {
    for (const url of ELO_URLS) {
      try {
        const response = await fetch(url, {cache: 'no-store', credentials: 'same-origin'});
        if (!response.ok) continue;
        const data = await response.json();
        if (!data || typeof data !== 'object' || !data.players) continue;
        sharedEloState.players = data.players;
        sharedEloState.games = Array.isArray(data.games) ? data.games : [];
        sharedEloState.loaded = true;
        sharedEloState.failed = false;
        return;
      } catch (e) {
        // Try next source.
      }
    }
    sharedEloState.failed = true;
  })().finally(() => {
    sharedEloFetch = null;
  });

  await sharedEloFetch;
}

export function fallbackEloEntry(playerName: string): EloEntry | null {
  if (!playerName) return null;
  return {
    elo: 1500,
    games: 0,
    wins: 0,
    totalVP: 0,
    avgPlaceScore: 0,
    displayName: playerName,
  };
}

export function findMatchingEloGame(games: Array<EloGame>, players: Array<EloPlayerSummary>): EloGame | undefined {
  const expected = new Map<string, number>();
  for (const player of players) {
    expected.set(normalizeEloName(player.name), player.victoryPointsBreakdown.total);
  }

  return [...games].reverse().find((game) => {
    const results = Array.isArray(game.results) ? game.results : [];
    if (results.length !== players.length) return false;

    const matched = new Set<string>();
    for (const result of results) {
      const key = normalizeEloName(result.displayName || result.name || '');
      const vp = Number(result.vp);
      if (!expected.has(key) || expected.get(key) !== vp || matched.has(key)) {
        return false;
      }
      matched.add(key);
    }
    return matched.size === expected.size;
  });
}

export function buildEloResultsForPlayers(
  playersInPlace: Array<EloPlayerSummary>,
  eloPlayers: Record<string, EloEntry>,
  matchedGame: EloGame,
): Array<EloResultRow> {
  const rows: Array<EloResultRow> = [];
  const results = Array.isArray(matchedGame.results) ? matchedGame.results : [];
  const resultsByName = new Map<string, EloGameResult>();

  for (const result of results) {
    resultsByName.set(normalizeEloName(result.displayName || result.name || ''), result);
  }

  for (const player of playersInPlace) {
    const key = normalizeEloName(player.name);
    const result = resultsByName.get(key);
    if (!result) continue;

    const eloEntry = lookupEloEntry(eloPlayers, player.name);
    const oldElo = typeof result.oldElo === 'number' ? result.oldElo : 1500;
    const newElo = typeof result.newElo === 'number' ? result.newElo : (typeof eloEntry?.elo === 'number' ? eloEntry.elo : oldElo);
    const delta = typeof result.delta === 'number' ? result.delta : (newElo - oldElo);

    rows.push({
      name: player.name,
      color: player.color,
      oldElo,
      newElo,
      delta,
      avgPlaceScore: eloEntry?.avgPlaceScore,
    });
  }

  return rows;
}
