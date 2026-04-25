import {promises as fs} from 'fs';

import {toName} from '../../common/utils/utils';
import {IGame} from '../IGame';
import {isICorporationCard} from '../cards/corporation/ICorporationCard';
import {getEloMirrorPath, getEloPrimaryPath} from './EloPaths';

const DEFAULT_ELO = 1500;
const BASE_K = 32;
const PLAYER_ALIASES: Record<string, string> = {
  'gydro': 'GydRo',
  'руслан': 'GydRo',
  'ruslan': 'GydRo',
  'genuinegold': 'Илья',
  'паша': 'Паша',
  'павел': 'Паша',
  'тома': 'Тома',
  'соня': 'Тома',
  'анатолий': 'Анатолий',
  'антистресс': 'Анатолий',
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
  source?: string;
  analyzedBy?: Array<string>;
  analysisTargets?: Array<string>;
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
  totalGens?: number;
  avgGens?: number;
  totalMargin?: number;
  avgMargin?: number;
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
  place?: number;
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
  botPlayerIds?: Array<string>;
  source?: string;
  analyzedBy?: Array<string>;
  analysisTargets?: Array<string>;
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
  const alias = PLAYER_ALIASES[stripped.toLowerCase()];
  const canonical = alias || stripped || '?';
  if (alias !== undefined) {
    return {key: canonical.toLowerCase(), displayName: canonical};
  }
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
    totalGens: 0,
    avgGens: 0,
    totalMargin: 0,
    avgMargin: 0,
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
  const normalizedPlayers = summary.players
    .map((player) => {
      const normalized = normalizeEloIdentity(player.name, player.user);
      return {
        name: normalized.key,
        displayName: normalized.displayName,
        user: normalized.user,
        place: typeof player.place === 'number' && Number.isFinite(player.place) && player.place > 0 ? Math.floor(player.place) : undefined,
        vp: player.vp,
        corp: player.corp || '',
      };
    });
  const hasExplicitPlaces = normalizedPlayers.length > 0 && normalizedPlayers.every((player) => player.place !== undefined);
  const sorted = normalizedPlayers.sort((a, b) => {
    if (hasExplicitPlaces) {
      return (a.place ?? 999) - (b.place ?? 999) || b.vp - a.vp;
    }
    return b.vp - a.vp;
  });

  const results: Array<EloStoredResult> = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let place = current.place ?? (i + 1);
    if (!hasExplicitPlaces && i > 0 && current.vp === sorted[i - 1].vp) {
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
    source: normalizeOptionalString(summary.source),
    analyzedBy: normalizeStringList(summary.analyzedBy),
    analysisTargets: normalizeStringList(summary.analysisTargets),
    results,
  };
}

function parseTimestamp(value: string | number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const millis = Date.parse(value);
    if (Number.isFinite(millis) && millis > 0) {
      return Math.floor(millis / 1000);
    }
  }
  return undefined;
}

function roundMinutes(durationMs: number | undefined): number | undefined {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) return undefined;
  return Math.round(durationMs / 60_000);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeStringList(value: unknown): Array<string> | undefined {
  const rawValues = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : []);
  const normalized = rawValues
    .map((entry) => typeof entry === 'string' ? entry.trim() : '')
    .filter((entry) => entry !== '');
  if (normalized.length === 0) return undefined;
  return [...new Set(normalized)];
}

function mergeStringLists(left: Array<string> | undefined, right: Array<string> | undefined): Array<string> | undefined {
  const merged = [...(left ?? []), ...(right ?? [])]
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  if (merged.length === 0) return undefined;
  return [...new Set(merged)];
}

function normalizeStoredGame(game: EloStoredGame): EloStoredGame {
  const completedTime = parseTimestamp(game.completedTime) ?? parseTimestamp(game.date);
  const startedTime = parseTimestamp(game.startedTime);
  const rawDurationMs = typeof game.durationMs === 'number' && Number.isFinite(game.durationMs) && game.durationMs >= 0 ?
    Math.round(game.durationMs) :
    undefined;
  const durationMs = rawDurationMs ??
    (startedTime !== undefined && completedTime !== undefined ? Math.max(0, (completedTime - startedTime) * 1000) : undefined);
  const durationMinutes = typeof game.durationMinutes === 'number' && Number.isFinite(game.durationMinutes) && game.durationMinutes >= 0 ?
    Math.round(game.durationMinutes) :
    roundMinutes(durationMs);
  const date = game.date && game.date.trim() !== '' ?
    game.date :
    (completedTime !== undefined ? new Date(completedTime * 1000).toISOString() : '');
  const source = normalizeOptionalString((game as Partial<EloStoredGame>).source);
  const analyzedBy = normalizeStringList((game as Partial<EloStoredGame>).analyzedBy);
  const analysisTargets = normalizeStringList((game as Partial<EloStoredGame>).analysisTargets);
  const results = (Array.isArray(game.results) ? game.results : []).map((entry) => {
    const normalized = normalizeEloIdentity(entry.displayName || entry.name, entry.user);
    return {
      ...entry,
      name: normalized.key,
      displayName: normalized.displayName,
      user: normalized.user,
    };
  });

  return {
    ...game,
    date,
    completedTime: completedTime ?? 0,
    startedTime,
    durationMs,
    durationMinutes,
    source,
    analyzedBy,
    analysisTargets,
    results,
  };
}

function mergeStoredGameMetadata(record: EloStoredGame, existing: EloStoredGame | undefined): EloStoredGame {
  if (existing === undefined) return record;
  return {
    ...record,
    source: record.source ?? existing.source,
    analyzedBy: mergeStringLists(existing.analyzedBy, record.analyzedBy),
    analysisTargets: mergeStringLists(existing.analysisTargets, record.analysisTargets),
  };
}

function getVpMargin(entries: Array<EloStoredResult>, entry: EloStoredResult): number {
  const leaderVp = entries.reduce((max, current) => Math.max(max, current.vp), Number.NEGATIVE_INFINITY);
  if (!Number.isFinite(leaderVp)) return 0;
  if (entry.place === 1) {
    const otherVps = entries
      .filter((current) => current !== entry)
      .map((current) => current.vp);
    if (otherVps.length === 0) return 0;
    return entry.vp - Math.max(...otherVps);
  }
  return entry.vp - leaderVp;
}

export function rebuildEloData(games: Array<EloStoredGame>): EloData {
  const normalizedGames = [...games]
    .filter((game) => Array.isArray(game.results) && game.results.length >= 2)
    .map((game) => normalizeStoredGame(game))
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
      if (game.generation > 0) {
        current.totalGens = (current.totalGens ?? 0) + game.generation;
      }
      current.totalMargin = (current.totalMargin ?? 0) + getVpMargin(entries, entry);
      if (entry.corp) current.corps[entry.corp] = (current.corps[entry.corp] || 0) + 1;
    }
  }

  const finalizedPlayers: Record<string, EloPlayerRecord> = {};
  for (const [key, player] of Object.entries(players)) {
    const avgPlace = player.games > 0 ? round3(player.placeScoreSum / player.games) : 0;
    const totalGens = player.totalGens ?? 0;
    const totalMargin = player.totalMargin ?? 0;
    finalizedPlayers[key] = {
      elo: player.elo,
      elo_vp: player.elo_vp,
      displayName: player.displayName,
      user: player.user,
      games: player.games,
      wins: player.wins,
      top3: player.top3,
      totalVP: player.totalVP,
      totalGens,
      avgGens: player.games > 0 ? round3(totalGens / player.games) : 0,
      totalMargin,
      avgMargin: player.games > 0 ? round3(totalMargin / player.games) : 0,
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

function buildCompletedGameSummary(game: IGame, botPlayerIds: Array<string> = []): CompletedGameSummary {
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
    botPlayerIds: normalizeStringList(botPlayerIds),
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

function hasBotPlayers(summary: CompletedGameSummary): boolean {
  return (normalizeStringList(summary.botPlayerIds)?.length ?? 0) > 0;
}

function shouldSkipSummary(summary: CompletedGameSummary): boolean {
  return (summary.players || []).length < 2 || hasBotPlayers(summary);
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

  public async recordCompletedGame(game: IGame, options?: {botPlayerIds?: Array<string>}): Promise<void> {
    await this.recordCompletedGameSummary(buildCompletedGameSummary(game, options?.botPlayerIds));
  }

  public async recordCompletedGameSummary(summary: CompletedGameSummary): Promise<void> {
    if (shouldSkipSummary(summary)) return;
    const task = this.queue.then(() => this.persistSummary(summary));
    this.queue = task.catch(() => undefined);
    await task;
  }

  private async persistSummary(summary: CompletedGameSummary): Promise<void> {
    const current = await this.loadCurrentData();
    const existing = current.games.find((game) => game._key === summary.key);
    const record = mergeStoredGameMetadata(buildEloGameFromSummary(summary), existing);
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
