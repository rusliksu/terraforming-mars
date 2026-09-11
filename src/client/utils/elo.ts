import {reactive} from 'vue';
import {Color} from '@/common/Color';
import {hasEloPlayerNameAlias, normalizeEloPlayerName} from '@/client/utils/normalizeEloPlayerName';

export type EloEntry = {
  elo?: number;
  games?: number;
  wins?: number;
  totalVP?: number;
  avgPlaceScore?: number;
  displayName?: string;
  user?: string;
  completionReliability?: {
    games?: number;
    leaves?: number;
    rate?: number;
    eligible?: boolean;
  };
};

export type EloGameResult = {
  name?: string;
  displayName?: string;
  user?: string;
  oldElo?: number;
  newElo?: number;
  delta?: number;
  place?: number;
  placeFrom?: number;
  placeTo?: number;
  vp?: number;
};

export type EloGame = {
  source?: string;
  analyzedBy?: Array<string>;
  analysisTargets?: Array<string>;
  results?: Array<EloGameResult>;
};

export type EloResultRow = {
  name: string;
  color: Color;
  oldElo: number;
  newElo: number;
  delta: number;
  placeLabel: string;
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
  user?: string;
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

function normalizeEloUserKey(user: string): string {
  return 'user:' + String(user).trim();
}

function getPlayerIdentityKeys(playerName: string, playerUser?: string): Array<string> {
  const keys: Array<string> = [];
  if (playerUser && playerUser.trim() !== '') {
    keys.push(normalizeEloUserKey(playerUser));
  }
  if (playerName) {
    keys.push(normalizeEloName(playerName));
  }
  return keys;
}

function getResultIdentityKeys(result: EloGameResult): Array<string> {
  const keys: Array<string> = [];
  if (result.user && result.user.trim() !== '') {
    keys.push(normalizeEloUserKey(result.user));
  }
  const resultName = result.displayName || result.name || '';
  if (resultName) {
    keys.push(normalizeEloName(resultName));
  }
  return keys;
}

function identityKeysOverlap(left: Array<string>, right: Array<string>): boolean {
  for (const key of left) {
    if (right.includes(key)) {
      return true;
    }
  }
  return false;
}

function findMatchingResultIndex(results: Array<EloGameResult>, player: EloPlayerSummary, used: Set<number>): number {
  const playerKeys = getPlayerIdentityKeys(player.name, player.user);
  for (let i = 0; i < results.length; i++) {
    if (used.has(i)) {
      continue;
    }
    const result = results[i];
    if (Number(result.vp) !== player.victoryPointsBreakdown.total) {
      continue;
    }
    if (!identityKeysOverlap(playerKeys, getResultIdentityKeys(result))) {
      continue;
    }
    return i;
  }
  return -1;
}

function canMatchGameResults(players: Array<EloPlayerSummary>, results: Array<EloGameResult>): boolean {
  if (results.length !== players.length) {
    return false;
  }
  const used = new Set<number>();

  const playerOrder = [...players].sort((a, b) => {
    const aWeight = a.user ? 0 : 1;
    const bWeight = b.user ? 0 : 1;
    if (aWeight !== bWeight) {
      return aWeight - bWeight;
    }
    return a.name.localeCompare(b.name);
  });

  for (const player of playerOrder) {
    const idx = findMatchingResultIndex(results, player, used);
    if (idx === -1) {
      return false;
    }
    used.add(idx);
  }
  return used.size === results.length;
}

export function lookupEloEntry(players: Record<string, EloEntry>, playerName: string, playerUser?: string): EloEntry | null {
  if (playerUser && playerUser.trim() !== '') {
    const byUser = players[normalizeEloUserKey(playerUser)];
    if (byUser) {
      return byUser;
    }
    if (!hasEloPlayerNameAlias(playerName)) {
      return null;
    }
  }
  if (!playerName) {
    return null;
  }
  const normalized = normalizeEloName(playerName);
  if (players[normalized]) {
    return players[normalized];
  }

  const playerNameLower = playerName.trim().toLowerCase();
  for (const key of Object.keys(players)) {
    const entry = players[key];
    if (entry.displayName && entry.displayName.trim().toLowerCase() === playerNameLower) {
      return entry;
    }
  }
  return null;
}

export async function ensureEloLoaded(force = false): Promise<void> {
  if (!force && (sharedEloState.loaded || sharedEloState.failed)) {
    return;
  }
  if (sharedEloFetch !== null) {
    await sharedEloFetch;
    if (!force) {
      return;
    }
  }
  if (typeof fetch !== 'function') {
    return;
  }

  if (force) {
    sharedEloState.loaded = false;
    sharedEloState.failed = false;
  }

  sharedEloFetch = (async () => {
    for (const url of ELO_URLS) {
      try {
        const response = await fetch(url, {cache: 'no-store', credentials: 'same-origin'});
        if (!response.ok) {
          continue;
        }
        const data = await response.json();
        if (!data || typeof data !== 'object' || !data.players) {
          continue;
        }
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
  if (!playerName) {
    return null;
  }
  return {
    elo: 1500,
    games: 0,
    wins: 0,
    totalVP: 0,
    avgPlaceScore: 0,
    displayName: playerName,
  };
}

export function formatEloPlace(result: EloGameResult): string {
  if (typeof result.placeFrom === 'number' && typeof result.placeTo === 'number' && result.placeTo > result.placeFrom) {
    return `${result.placeFrom}–${result.placeTo}`;
  }
  return typeof result.place === 'number' ? String(result.place) : '—';
}

export function findMatchingEloGame(games: Array<EloGame>, players: Array<EloPlayerSummary>): EloGame | undefined {
  return [...games].reverse().find((game) => {
    const results = Array.isArray(game.results) ? game.results : [];
    return canMatchGameResults(players, results);
  });
}

export function buildEloResultsForPlayers(
  playersInPlace: Array<EloPlayerSummary>,
  eloPlayers: Record<string, EloEntry>,
  matchedGame: EloGame,
): Array<EloResultRow> {
  const rows: Array<EloResultRow> = [];
  const results = Array.isArray(matchedGame.results) ? matchedGame.results : [];
  const used = new Set<number>();

  for (const player of playersInPlace) {
    const idx = findMatchingResultIndex(results, player, used);
    if (idx === -1) {
      continue;
    }
    used.add(idx);
    const result = results[idx];

    const eloEntry = lookupEloEntry(eloPlayers, player.name, player.user);
    const oldElo = typeof result.oldElo === 'number' ? result.oldElo : 1500;
    const newElo = typeof result.newElo === 'number' ? result.newElo : (typeof eloEntry?.elo === 'number' ? eloEntry.elo : oldElo);
    const delta = typeof result.delta === 'number' ? result.delta : (newElo - oldElo);

    rows.push({
      name: eloEntry?.displayName || result.displayName || player.name,
      color: player.color,
      oldElo,
      newElo,
      delta,
      placeLabel: formatEloPlace(result),
      avgPlaceScore: eloEntry?.avgPlaceScore,
    });
  }

  return rows;
}
