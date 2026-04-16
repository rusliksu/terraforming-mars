import {promises as fs} from 'fs';

import {toName} from '../../common/utils/utils';
import {IGame} from '../IGame';
import {isICorporationCard} from '../cards/corporation/ICorporationCard';
import {getEloMirrorPath, getEloPrimaryPath} from './EloPaths';

const DEFAULT_ELO = 1500;
const BASE_K = 32;
const PLAYER_ALIASES: Record<string, string> = {
  'gydro': 'GydRo',
  'ruslan': 'GydRo',
  'genuinegold': 'Илья',
  'лёха': 'Алексей',
  'леха': 'Алексей',
};

export type EloStoredResult = {
  name: string;
  displayName: string;
  user?: string;
  oldElo?: number;
  newElo?: number;
  delta?: number;
  place: number;
  vp: number;
  corp: string;
};

export type EloStoredGame = {
  _key: string;
  gameId?: string;
  endId?: string;
  date: string;
  server: string;
  map: string;
  generation: number;
  playerCount: number;
  startedTime?: number;
  completedTime: number;
  durationMs?: number;
  durationMinutes?: number;
  results: Array<EloStoredResult>;
};

export type EloPlayerRecord = {
  elo: number;
  elo_vp: number;
  displayName: string;
  user?: string;
  games: number;
  wins: number;
  top3: number;
  totalVP: number;
  avgVP?: number;
  avgPlace: number;
  avgPlaceScore: number;
  corps: Record<string, number>;
};

export type EloData = {
  players: Record<string, EloPlayerRecord>;
  games: Array<EloStoredGame>;
};

export type CompletedGamePlayerSummary = {
  name: string;
  user?: string;
  vp: number;
  corp: string;
};

export type CompletedGameSummary = {
  key: string;
  endId?: string;
  completedTime: number;
  startedTime?: number;
  durationMs?: number;
  durationMinutes?: number;
  server: string;
  map: string;
  generation: number;
  players: Array<CompletedGamePlayerSummary>;
};

type EloMutablePlayerRecord = EloPlayerRecord & {placeScoreSum: number};

function emptyEloData(): EloData {
  return {players: {}, games: []};
}

function normalizeEloUserKey(user: string): string {
  return 'user:' + String(user).trim();
}

export function normalizeEloIdentity(name: string, user?: string): {key: string; displayName: string; user?: string} {
  const stripped = (name || '').trim();
  const canonical = PLAYER_ALIASES[stripped.toLowerCase()] || stripped || '?';
  if (user && user.trim() !== '') {
    return {key: normalizeEloUserKey(user), displayName: canonical, user};
  }
  return {key: canonical.toLowerCase(), displayName: canonical};
}

function getK(elo: number): number {
  if (elo < 1400) return BASE_K * 1.2;
  if (elo < 1600) return BASE_K;
  if (elo < 1800) return BASE_K * 0.8;
  if (elo < 2000) return BASE_K * 0.6;
  return BASE_K * 0.4;
}

function expectedScore(myElo: number, oppElo: number): number {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}

export function normalizedPlaceScore(place: number, playerCount: number): number {
  if (playerCount <= 1) return 1;
  return Math.max(0, Math.min(1, 1 - ((place - 1) / (playerCount - 1))));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function createDefaultPlayer(displayName: string, user?: string): EloMutablePlayerRecord {
  return {
    elo: DEFAULT_ELO,
    elo_vp: DEFAULT_ELO,
    displayName,
    user,
    games: 0,
    wins: 0,
    top3: 0,
    totalVP: 0,
    avgVP: 0,
    avgPlace: 0,
    avgPlaceScore: 0,
    corps: {},
    placeScoreSum: 0,
  };
}

function getOrCreatePlayer(players: Record<string, EloMutablePlayerRecord>, key: string, displayName: string, user?: string): EloMutablePlayerRecord {
  const existing = players[key];
  if (existing !== undefined) {
    existing.displayName = displayName;
    if (user !== undefined) existing.user = user;
    return existing;
  }
  const created = createDefaultPlayer(displayName, user);
  players[key] = created;
  return created;
}

export function buildEloGameFromSummary(summary: CompletedGameSummary): EloStoredGame {
  const sorted = summary.players
    .map((player) => {
      const normalized = normalizeEloIdentity(player.name, player.user);
      return {
        name: normalized.key,
        displayName: normalized.displayName,
        user: normalized.user,
        vp: player.vp,
        corp: player.corp || '',
      };
    })
    .sort((a, b) => b.vp - a.vp);

  const results: Array<EloStoredResult> = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let place = i + 1;
    if (i > 0 && current.vp === sorted[i - 1].vp) {
      place = results[i - 1].place;
    }
    results.push({
      name: current.name,
      displayName: current.displayName,
      user: current.user,
      place,
      vp: current.vp,
      corp: current.corp,
    });
  }

  return {
    _key: summary.key,
    gameId: summary.key,
    endId: summary.endId,
    date: new Date(summary.completedTime * 1000).toISOString(),
    server: summary.server,
    map: summary.map,
    generation: summary.generation,
    playerCount: results.length,
    startedTime: summary.startedTime,
    completedTime: summary.completedTime,
    durationMs: summary.durationMs,
    durationMinutes: summary.durationMinutes,
    results,
  };
}

export function rebuildEloData(games: Array<EloStoredGame>): EloData {
  const normalizedGames = [...games]
    .filter((game) => Array.isArray(game.results) && game.results.length >= 2)
    .sort((a, b) => {
      const completedDelta = (a.completedTime || 0) - (b.completedTime || 0);
      if (completedDelta !== 0) return completedDelta;
      return a._key.localeCompare(b._key);
    });

  const players: Record<string, EloMutablePlayerRecord> = {};

  for (const game of normalizedGames) {
    const entries = game.results;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const current = getOrCreatePlayer(players, entry.name, entry.displayName, entry.user);
      const myElo = current.elo;
      let totalExpected = 0;
      let totalActual = 0;

      for (let j = 0; j < entries.length; j++) {
        if (i === j) continue;
        const opp = entries[j];
        const opponent = getOrCreatePlayer(players, opp.name, opp.displayName, opp.user);
        totalExpected += expectedScore(myElo, opponent.elo);
        if (entry.place < opp.place) totalActual += 1;
        else if (entry.place === opp.place) totalActual += 0.5;
      }

      const scaledK = getK(myElo) / (entries.length - 1) * 1.5;
      entry.oldElo = myElo;
      entry.newElo = Math.round(myElo + scaledK * (totalActual - totalExpected));
      entry.delta = entry.newElo - entry.oldElo;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const current = getOrCreatePlayer(players, entry.name, entry.displayName, entry.user);
      const myEloVp = current.elo_vp;
      let totalExpected = 0;
      let totalActual = 0;

      for (let j = 0; j < entries.length; j++) {
        if (i === j) continue;
        const opp = entries[j];
        const opponent = getOrCreatePlayer(players, opp.name, opp.displayName, opp.user);
        totalExpected += expectedScore(myEloVp, opponent.elo_vp);
        if (entry.vp > opp.vp) {
          const margin = Math.min((entry.vp - opp.vp) / 20, 1);
          totalActual += 0.5 + margin * 0.5;
        } else if (entry.vp === opp.vp) {
          totalActual += 0.5;
        } else {
          const margin = Math.min((opp.vp - entry.vp) / 20, 1);
          totalActual += 0.5 - margin * 0.5;
        }
      }

      const scaledK = getK(myEloVp) / (entries.length - 1) * 1.5;
      current.elo_vp = Math.round(myEloVp + scaledK * (totalActual - totalExpected));
    }

    for (const entry of entries) {
      const current = getOrCreatePlayer(players, entry.name, entry.displayName, entry.user);
      current.displayName = entry.displayName;
      if (entry.user !== undefined) current.user = entry.user;
      current.elo = entry.newElo ?? current.elo;
      current.games += 1;
      if (entry.place === 1) current.wins += 1;
      else if (entry.place < entries.length) current.wins += 0.5;
      if (entry.place <= 3) current.top3 += 1;
      current.placeScoreSum += normalizedPlaceScore(entry.place, entries.length);
      current.totalVP += entry.vp;
      if (entry.corp) current.corps[entry.corp] = (current.corps[entry.corp] || 0) + 1;
    }
  }

  const finalizedPlayers: Record<string, EloPlayerRecord> = {};
  for (const [key, player] of Object.entries(players)) {
    const avgPlace = player.games > 0 ? round3(player.placeScoreSum / player.games) : 0;
    finalizedPlayers[key] = {
      elo: player.elo,
      elo_vp: player.elo_vp,
      displayName: player.displayName,
      user: player.user,
      games: player.games,
      wins: player.wins,
      top3: player.top3,
      totalVP: player.totalVP,
      avgVP: player.games > 0 ? Math.round(player.totalVP / player.games) : 0,
      avgPlace,
      avgPlaceScore: avgPlace,
      corps: player.corps,
    };
  }

  return {
    players: finalizedPlayers,
    games: normalizedGames,
  };
}

function buildCompletedGameSummary(game: IGame): CompletedGameSummary {
  const completedTimeMs = Date.now();
  const completedTime = Math.floor(completedTimeMs / 1000);
  const startedTimeMs = game.createdTime instanceof Date ? game.createdTime.getTime() : NaN;
  const hasStartedTime = Number.isFinite(startedTimeMs) && startedTimeMs > 0;
  const durationMs = hasStartedTime ? Math.max(0, completedTimeMs - startedTimeMs) : undefined;
  return {
    key: game.id,
    endId: game.spectatorId,
    completedTime,
    startedTime: hasStartedTime ? Math.floor(startedTimeMs / 1000) : undefined,
    durationMs,
    durationMinutes: durationMs !== undefined ? Math.round(durationMs / 60_000) : undefined,
    server: process.env.ELO_SERVER_NAME ?? 'server',
    map: String(game.gameOptions.boardName ?? ''),
    generation: game.generation,
    players: game.players.map((player) => ({
      name: player.name,
      user: player.user,
      vp: player.getVictoryPoints().total,
      corp: player.playedCards.filter(isICorporationCard).map(toName).join('|'),
    })),
  };
}

async function loadJsonFile(file: string): Promise<EloData | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      players: typeof parsed.players === 'object' && parsed.players !== null ? parsed.players : {},
      games: Array.isArray(parsed.games) ? parsed.games : [],
    };
  } catch (error: unknown) {
    const err = error as {code?: string};
    if (err && err.code === 'ENOENT') return null;
    return null;
  }
}

async function writeJsonAtomic(file: string, payload: string): Promise<void> {
  const tempFile = file + '.tmp';
  await fs.writeFile(tempFile, payload, 'utf8');
  await fs.rename(tempFile, file);
}

export class EloSyncService {
  private static instance?: EloSyncService;
  private queue: Promise<void> = Promise.resolve();

  public static getInstance(): EloSyncService {
    if (EloSyncService.instance === undefined) {
      EloSyncService.instance = new EloSyncService();
    }
    return EloSyncService.instance;
  }

  public constructor(
    private readonly primaryPath: string = getEloPrimaryPath(),
    private readonly mirrorPath: string = getEloMirrorPath(),
  ) {}

  public async recordCompletedGame(game: IGame): Promise<void> {
    await this.recordCompletedGameSummary(buildCompletedGameSummary(game));
  }

  public async recordCompletedGameSummary(summary: CompletedGameSummary): Promise<void> {
    if ((summary.players || []).length < 2) return;
    const task = this.queue.then(() => this.persistSummary(summary));
    this.queue = task.catch(() => undefined);
    await task;
  }

  private async persistSummary(summary: CompletedGameSummary): Promise<void> {
    const current = await this.loadCurrentData();
    const record = buildEloGameFromSummary(summary);
    const mergedGames = current.games.filter((game) => game._key !== record._key);
    mergedGames.push(record);
    const rebuilt = rebuildEloData(mergedGames);
    await this.save(rebuilt);
  }

  private async loadCurrentData(): Promise<EloData> {
    return (await loadJsonFile(this.primaryPath)) ??
      (await loadJsonFile(this.mirrorPath)) ??
      emptyEloData();
  }

  private async save(data: EloData): Promise<void> {
    const payload = JSON.stringify(data, null, 2);
    await fs.mkdir(getParentDir(this.primaryPath), {recursive: true});
    await fs.mkdir(getParentDir(this.mirrorPath), {recursive: true});
    await writeJsonAtomic(this.primaryPath, payload);
    await writeJsonAtomic(this.mirrorPath, payload);
  }
}

function getParentDir(file: string): string {
  const idx = Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\'));
  return idx === -1 ? '.' : file.slice(0, idx);
}
