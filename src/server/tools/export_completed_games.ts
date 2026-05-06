require('dotenv').config();

import {existsSync, mkdirSync, statSync, writeFileSync} from 'fs';
import * as path from 'path';

type CliOptions = {
  output: string;
  format: 'json' | 'jsonl';
  limit?: number;
  since?: number;
  serverName: string;
};

type QueryRow = {
  game_id: string;
  generations: number | string | null;
  scores: string | null;
  completed_time: number | string | null;
  game_options: string | null;
  spectator_id: string | null;
  latest_game_json: string | null;
  started_time: number | string | null;
};

type RawScore = {
  corporation?: string;
  place?: number;
  playerName?: string;
  playerScore?: number;
  user?: string;
};

type FallbackPlayer = {
  name: string;
  user?: string;
};

type ExportedPlayer = {
  corp: string;
  name: string;
  place: number;
  user?: string;
  vp: number;
};

type ExportedGame = {
  completedTime: number;
  date: string;
  durationMinutes?: number;
  durationMs?: number;
  gameId: string;
  generation: number;
  map: string;
  players: Array<ExportedPlayer>;
  server: string;
  spectatorId?: string;
  startedTime?: number;
};

type ExportStats = {
  exported: number;
  skippedBot: number;
  skippedFewPlayers: number;
  skippedUnknownPlayer: number;
  skippedWithoutOutcome: number;
  totalRows: number;
};

type SqliteDatabase = {
  all(sql: string, params: Array<number>, cb: (err: Error | null, rows: Array<QueryRow>) => void): void;
  close(): void;
};

type SqliteDatabaseConstructor = new (
  filename: string,
  cb: (err: Error | null) => void,
) => SqliteDatabase;

function usage(): never {
  console.error('Usage: node build/src/server/tools/export_completed_games.js [--output <path>] [--format json|jsonl] [--limit <n>] [--since <unix-seconds|ISO-date>] [--server-name <name>]');
  console.error('Reads from POSTGRES_HOST when set, otherwise from local SQLite db/game.db or TM_DB_PATH.');
  process.exit(1);
}

function parsePositiveInt(raw: string, flag: string): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`invalid ${flag}: ${raw}`);
  }
  return value;
}

function parseSince(raw: string): number {
  if (/^\d+$/.test(raw)) {
    return parsePositiveInt(raw, '--since');
  }
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid --since value: ${raw}`);
  }
  return Math.floor(parsed / 1000);
}

function parseArgs(argv: Array<string>): CliOptions {
  let output = path.resolve(process.cwd(), 'artifacts', 'completed-games.jsonl');
  let format: 'json' | 'jsonl' | undefined;
  let limit: number | undefined;
  let since: number | undefined;
  let serverName = process.env.ELO_SERVER_NAME ?? 'server';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
    case '--output':
      if (next === undefined) {
        usage();
      }
      output = path.resolve(process.cwd(), next);
      i++;
      break;
    case '--format':
      if (next !== 'json' && next !== 'jsonl') {
        usage();
      }
      format = next;
      i++;
      break;
    case '--limit':
      if (next === undefined) {
        usage();
      }
      limit = parsePositiveInt(next, '--limit');
      i++;
      break;
    case '--since':
      if (next === undefined) {
        usage();
      }
      since = parseSince(next);
      i++;
      break;
    case '--server-name':
      if (next === undefined) {
        usage();
      }
      serverName = next.trim() || serverName;
      i++;
      break;
    default:
      usage();
    }
  }

  if (format === undefined) {
    format = output.toLowerCase().endsWith('.json') ? 'json' : 'jsonl';
  }

  return {output, format, limit, since, serverName};
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    return fallback;
  }
}

function asNumber(value: number | string | null | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function extractFallbackPlayers(rawGame: string | null): Array<FallbackPlayer> {
  const parsed = parseJson<{players?: Array<{name?: string; user?: string}>}>(rawGame, {});
  const players = parsed.players ?? [];
  return players.map((player) => ({
    name: asString(player.name) ?? '',
    user: asString(player.user),
  }));
}

function isBotGame(players: Array<{name: string}>): boolean {
  const names = players.map((player) => player.name.trim()).filter((name) => name !== '');
  if (names.length === 0) {
    return false;
  }
  if (names.every((name) => name.length <= 2)) {
    return true;
  }
  const testNames = new Set(['test', 'testa', 'testb', 'testc', 'bot']);
  return names.some((name) => testNames.has(name.toLowerCase()));
}

function buildPlayers(rawScoresText: string | null, rawGame: string | null): {players?: Array<ExportedPlayer>; reason?: keyof ExportStats} {
  const rawScores = parseJson<Array<RawScore>>(rawScoresText, []);
  if (rawScores.length < 2) {
    return {reason: 'skippedFewPlayers'};
  }

  const fallbacks = extractFallbackPlayers(rawGame);
  const aligned = rawScores.map((score, idx) => {
    const fallback = fallbacks[idx];
    return {
      corp: asString(score.corporation) ?? '',
      explicitPlace: asNumber(score.place),
      index: idx,
      name: asString(score.playerName) ?? fallback?.name ?? '',
      user: asString(score.user) ?? fallback?.user,
      vp: asNumber(score.playerScore) ?? 0,
    };
  });

  if (aligned.some((player) => player.name === '')) {
    return {reason: 'skippedUnknownPlayer'};
  }
  if (isBotGame(aligned)) {
    return {reason: 'skippedBot'};
  }

  const allHavePlace = aligned.every((player) => player.explicitPlace !== undefined);
  const anyNonZeroVp = aligned.some((player) => player.vp !== 0);

  if (allHavePlace) {
    const ordered = [...aligned]
      .sort((a, b) => (a.explicitPlace ?? 999) - (b.explicitPlace ?? 999) || b.vp - a.vp || a.index - b.index)
      .map((player) => ({
        corp: player.corp,
        name: player.name,
        place: player.explicitPlace ?? 999,
        user: player.user,
        vp: player.vp,
      }));
    if (ordered.length < 2) {
      return {reason: 'skippedFewPlayers'};
    }
    return {players: ordered};
  }

  if (!anyNonZeroVp) {
    return {reason: 'skippedWithoutOutcome'};
  }

  const ordered = [...aligned].sort((a, b) => b.vp - a.vp || a.index - b.index);
  const players: Array<ExportedPlayer> = [];
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    let place = i + 1;
    if (i > 0 && current.vp === ordered[i - 1].vp) {
      place = players[i - 1].place;
    }
    players.push({
      corp: current.corp,
      name: current.name,
      place,
      user: current.user,
      vp: current.vp,
    });
  }
  if (players.length < 2) {
    return {reason: 'skippedFewPlayers'};
  }
  return {players};
}

function mapNameFromOptions(rawOptions: string | null): string {
  const parsed = parseJson<{boardName?: string}>(rawOptions, {});
  return asString(parsed.boardName) ?? '';
}

function toExportedGame(row: QueryRow, serverName: string): {game?: ExportedGame; reason?: keyof ExportStats} {
  const playerResult = buildPlayers(row.scores, row.latest_game_json);
  if (playerResult.players === undefined) {
    return {reason: playerResult.reason};
  }

  const completedTime = asNumber(row.completed_time) ?? 0;
  const startedTime = asNumber(row.started_time);
  const durationMs = completedTime > 0 && startedTime !== undefined && completedTime >= startedTime ?
    Math.max(0, (completedTime - startedTime) * 1000) :
    undefined;

  return {
    game: {
      completedTime,
      date: completedTime > 0 ? new Date(completedTime * 1000).toISOString() : '',
      durationMinutes: durationMs !== undefined ? Math.round(durationMs / 60000) : undefined,
      durationMs,
      gameId: row.game_id,
      generation: asNumber(row.generations) ?? 0,
      map: mapNameFromOptions(row.game_options),
      players: playerResult.players,
      server: serverName,
      spectatorId: asString(row.spectator_id),
      startedTime,
    },
  };
}

async function loadPostgresRows(options: CliOptions): Promise<Array<QueryRow>> {
  const {Pool} = await import('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_HOST,
    ssl: process.env.POSTGRES_HOST?.startsWith('postgres') ? {rejectUnauthorized: false} : undefined,
  });

  const clauses: Array<string> = [];
  const params: Array<number> = [];
  if (options.since !== undefined) {
    params.push(options.since);
    clauses.push(`COALESCE(EXTRACT(EPOCH FROM cg.completed_time)::bigint, 0) >= $${params.length}`);
  }

  let sql = `
    WITH first_save AS (
      SELECT game_id, EXTRACT(EPOCH FROM MIN(created_time))::bigint AS started_time
      FROM games
      GROUP BY game_id
    ),
    latest_games AS (
      SELECT g.game_id, g.game,
        ROW_NUMBER() OVER (PARTITION BY g.game_id ORDER BY g.save_id DESC) AS rn
      FROM games g
    )
    SELECT
      gr.game_id,
      gr.generations,
      gr.scores,
      COALESCE(EXTRACT(EPOCH FROM cg.completed_time)::bigint, 0) AS completed_time,
      gr.game_options,
      COALESCE((lg.game::json ->> 'spectatorId'), '') AS spectator_id,
      lg.game AS latest_game_json,
      COALESCE(fs.started_time, 0) AS started_time
    FROM game_results gr
    LEFT JOIN completed_game cg ON cg.game_id = gr.game_id
    LEFT JOIN latest_games lg ON lg.game_id = gr.game_id AND lg.rn = 1
    LEFT JOIN first_save fs ON fs.game_id = gr.game_id
  `;

  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(' AND ')} `;
  }
  sql += ' ORDER BY COALESCE(EXTRACT(EPOCH FROM cg.completed_time)::bigint, 0), gr.game_id ';
  if (options.limit !== undefined) {
    params.push(options.limit);
    sql += ` LIMIT $${params.length} `;
  }

  try {
    const result = await pool.query<QueryRow>(sql, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}

async function loadSqliteRows(options: CliOptions): Promise<Array<QueryRow>> {
  const filename = path.resolve(process.cwd(), process.env.TM_DB_PATH ?? path.join('db', 'game.db'));
  if (!existsSync(filename) || statSync(filename).size === 0) {
    throw new Error(`SQLite database is missing or empty: ${filename}. Set TM_DB_PATH to a populated game.db or use POSTGRES_HOST.`);
  }

  const Database = (require('sqlite3') as {Database: SqliteDatabaseConstructor}).Database;

  const clauses: Array<string> = [];
  const params: Array<number> = [];
  if (options.since !== undefined) {
    clauses.push('COALESCE(cg.completed_time, 0) >= ?');
    params.push(options.since);
  }

  let sql = `
    WITH first_save AS (
      SELECT game_id, MIN(created_time) AS started_time
      FROM games
      GROUP BY game_id
    ),
    latest_games AS (
      SELECT g.game_id, g.game
      FROM games g
      JOIN (
        SELECT game_id, MAX(save_id) AS max_save_id
        FROM games
        GROUP BY game_id
      ) latest ON latest.game_id = g.game_id AND latest.max_save_id = g.save_id
    )
    SELECT
      gr.game_id,
      gr.generations,
      gr.scores,
      COALESCE(cg.completed_time, 0) AS completed_time,
      gr.game_options,
      COALESCE(json_extract(lg.game, '$.spectatorId'), '') AS spectator_id,
      lg.game AS latest_game_json,
      COALESCE(fs.started_time, 0) AS started_time
    FROM game_results gr
    LEFT JOIN completed_game cg ON cg.game_id = gr.game_id
    LEFT JOIN latest_games lg ON lg.game_id = gr.game_id
    LEFT JOIN first_save fs ON fs.game_id = gr.game_id
  `;

  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(' AND ')} `;
  }
  sql += ' ORDER BY COALESCE(cg.completed_time, 0), gr.game_id ';
  if (options.limit !== undefined) {
    sql += ' LIMIT ? ';
    params.push(options.limit);
  }

  return await new Promise<Array<QueryRow>>((resolve, reject) => {
    const db = new Database(filename, (openErr: Error | null) => {
      if (openErr) {
        reject(openErr);
        return;
      }
      db.all(sql, params, (err: Error | null, rows: Array<QueryRow>) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  });
}

function renderOutput(games: Array<ExportedGame>, format: 'json' | 'jsonl'): string {
  if (format === 'json') {
    return JSON.stringify(games, null, 2);
  }
  return games.map((game) => JSON.stringify(game)).join('\n') + '\n';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = process.env.POSTGRES_HOST !== undefined ?
    await loadPostgresRows(options) :
    await loadSqliteRows(options);

  const stats: ExportStats = {
    exported: 0,
    skippedBot: 0,
    skippedFewPlayers: 0,
    skippedUnknownPlayer: 0,
    skippedWithoutOutcome: 0,
    totalRows: rows.length,
  };
  const games: Array<ExportedGame> = [];

  for (const row of rows) {
    const result = toExportedGame(row, options.serverName);
    if (result.game !== undefined) {
      games.push(result.game);
      stats.exported++;
    } else if (result.reason !== undefined) {
      stats[result.reason]++;
    }
  }

  mkdirSync(path.dirname(options.output), {recursive: true});
  writeFileSync(options.output, renderOutput(games, options.format), 'utf8');

  console.log(`Source rows: ${stats.totalRows}`);
  console.log(`Exported: ${stats.exported}`);
  console.log(`Skipped bot/test: ${stats.skippedBot}`);
  console.log(`Skipped <2 players: ${stats.skippedFewPlayers}`);
  console.log(`Skipped unknown players: ${stats.skippedUnknownPlayer}`);
  console.log(`Skipped without outcome: ${stats.skippedWithoutOutcome}`);
  console.log(`Saved: ${options.output}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
