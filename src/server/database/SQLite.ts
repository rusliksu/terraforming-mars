import fs from 'fs';
import path from 'path';
import BetterSqlite3 = require('better-sqlite3');

import {GameIdLedger, IDatabase} from './IDatabase';
import {IGame, Score} from '../IGame';
import {GameOptions} from '../game/GameOptions';
import {GameId, ParticipantId} from '../../common/Types';
import {SerializedGame} from '../SerializedGame';
import {daysAgoToSeconds} from './utils';
import {MultiMap} from 'mnemonist';
import {Session, SessionId} from '../auth/Session';
import {toID} from '../../common/utils/utils';
import {assertSaveIdWithinLimit, resolveMaxSavesPerGame} from './HistoryLimits';
import {ArchiveLocation, SQLiteArchiveRetention} from '@/server/archive/SQLiteArchiveRetention';

export const IN_MEMORY_SQLITE_PATH = ':memory:';

export class SQLite implements IDatabase {
  private _db: BetterSqlite3.Database | undefined;
  private _archive: SQLiteArchiveRetention | undefined;

  protected get archive(): SQLiteArchiveRetention {
    if (this._archive === undefined) {
      throw new Error('attempt to get archive before initialize');
    }
    return this._archive;
  }

  protected get db(): BetterSqlite3.Database {
    if (this._db === undefined) {
      throw new Error('attempt to get db before initialize');
    }
    return this._db;
  }

  constructor(
    private filename: undefined | string = undefined,
    private throwQuietFailures: boolean = false,
    private readonly maxSavesPerGame: number = resolveMaxSavesPerGame(),
    private readonly archiveLocation: ArchiveLocation = {
      root: process.env.TM_HISTORY_ARCHIVE_ROOT ?? '', workspace: process.env.TM_HISTORY_ARCHIVE_WORKSPACE,
    },
  ) {
  }

  public async initialize(): Promise<void> {
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    const dbPath = path.resolve(process.cwd(), './db/game.db');
    if (this.filename === undefined) {
      this.filename = dbPath;
    }
    if (this.filename !== IN_MEMORY_SQLITE_PATH) {
      const dbFolder = path.dirname(path.resolve(this.filename));
      if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder);
      }
    }
    this._db = new Database(String(this.filename));
    await this.asyncRun('CREATE TABLE IF NOT EXISTS games(game_id varchar, players integer, save_id integer, game text, status text default \'running\', created_time timestamp default (strftime(\'%s\', \'now\')), PRIMARY KEY (game_id, save_id))');
    await this.asyncRun('CREATE TABLE IF NOT EXISTS participants(game_id varchar, participant varchar, PRIMARY KEY (game_id, participant))');
    await this.asyncRun('CREATE TABLE IF NOT EXISTS game_results(game_id varchar not null, seed_game_id varchar, players integer, generations integer, game_options text, scores text, PRIMARY KEY (game_id))');
    await this.asyncRun(
      `CREATE TABLE IF NOT EXISTS completed_game(
      game_id varchar not null,
      completed_time timestamp not null default (strftime('%s', 'now')),
      PRIMARY KEY (game_id))`);
    await this.asyncRun('DROP TABLE IF EXISTS purges');

    await this.asyncRun(
      `CREATE TABLE IF NOT EXISTS session(
        session_id varchar not null,
        data varchar not null,
        expiration_time timestamp not null,
        PRIMARY KEY (session_id)
      )`);
    this._archive = new SQLiteArchiveRetention(this.db,
      this.filename === IN_MEMORY_SQLITE_PATH ? this.filename : path.resolve(this.filename), this.archiveLocation);
    this._archive.catalog.initialize();
  }

  public async getPlayerCount(gameId: GameId): Promise<number> {
    const sql = 'SELECT players FROM games WHERE save_id = 0 AND game_id = ? LIMIT 1';
    const row = await this.asyncGet(sql, [gameId]);
    if (row === undefined) {
      throw new Error(`bad game id ${gameId}`);
    }
    return row.players;
  }

  public async getGameIds(): Promise<Array<GameId>> {
    const sql = 'SELECT distinct game_id game_id FROM games';
    const rows = await this.asyncAll(sql, []);
    return rows.map((row) => row.game_id);
  }

  saveGameResults(gameId: GameId, players: number, generations: number, gameOptions: GameOptions, scores: Array<Score>): void {
    try {
      this.db.prepare(
        'INSERT INTO game_results (game_id, seed_game_id, players, generations, game_options, scores) VALUES(?, ?, ?, ?, ?, ?)',
      ).run([gameId, gameOptions.clonedGamedId, players, generations, JSON.stringify(gameOptions), JSON.stringify(scores)]);
    } catch (err) {
      console.error('SQLite:saveGameResults', err);
      throw err;
    }
  }

  public async getGame(gameId: GameId): Promise<SerializedGame> {
    // Retrieve last save from database
    const row: { game: any; } = await this.asyncGet('SELECT game game FROM games WHERE game_id = ? ORDER BY save_id DESC LIMIT 1', [gameId]);
    if (row === undefined) {
      throw new Error(`bad game id ${gameId}`);
    }
    return JSON.parse(row.game);
  }

  public async getGameId(participantId: ParticipantId): Promise<GameId> {
    // Default sql is for player id;
    let sql = 'SELECT game_id from games, json_each(games.game, \'$.players\') e where json_extract(e.value, \'$.id\') = ?';
    if (participantId.charAt(0) === 's') {
      sql = 'SELECT game_id from games where json_extract(games.game, \'$.spectatorId\') = ?';
    } else if (participantId.charAt(0) !== 'p') {
      throw new Error(`id ${participantId} is neither a player id or spectator id`);
    }

    const row: { game_id: any; } = await this.asyncGet(sql, [participantId]);
    if (row === undefined) {
      throw new Error(`No game id found for participant id ${participantId}`);
    }
    return row.game_id;
  }

  public getSaveIds(gameId: GameId): Promise<Array<number>> {
    return this.archive.catalog.getSaveIds(gameId);
  }

  public async getGameVersion(gameId: GameId, saveId: number): Promise<SerializedGame> {
    const row: {game: string} | undefined = await this.asyncGet('SELECT game FROM games WHERE game_id = ? AND save_id = ?', [gameId, saveId]);
    if (row !== undefined) {
      return JSON.parse(row.game);
    }
    if (this.archive.catalog.getBinding(gameId) !== undefined) {
      return await this.archive.catalog.getGameVersion(gameId, saveId) as unknown as SerializedGame;
    }
    throw new Error(`Game ${gameId} not found`);
  }

  async markFinished(gameId: GameId): Promise<void> {
    await this.asyncRun(`INSERT INTO completed_game (game_id) VALUES (?)
      ON CONFLICT (game_id) DO UPDATE SET completed_time = strftime('%s', 'now')`, [gameId]);
    await this.asyncRun('UPDATE games SET status = \'finished\' WHERE game_id = ?', [gameId]);
  }


  async purgeUnfinishedGames(maxGameDays: string | undefined = process.env.MAX_GAME_DAYS): Promise<Array<GameId>> {
    // Purge unfinished games older than MAX_GAME_DAYS days. If this .env variable is not present, unfinished games will not be purged.
    if (maxGameDays !== undefined) {
      const dateToSeconds = daysAgoToSeconds(maxGameDays, 0);
      const selectResult = await this.asyncAll(
        `SELECT latest.game_id game_id
        FROM games latest
        JOIN (
          SELECT game_id, MAX(save_id) AS max_save_id, MAX(created_time) AS latest_created_time
          FROM games
          GROUP BY game_id
        ) latest_save ON latest.game_id = latest_save.game_id AND latest.save_id = latest_save.max_save_id
        WHERE latest_save.latest_created_time < ?
          and TRIM(latest.status) = 'running'
          and COALESCE(json_extract(latest.game, '$.gameOptions.turnBasedGame'), 0) != 1`,
        [dateToSeconds]);
      let gameIds = selectResult.map((row) => row.game_id);
      if (gameIds.length > 1000) {
        console.log('Truncated purge to 1000 games.');
        gameIds = gameIds.slice(0, 1000);
      } else {
        console.log(`${gameIds.length} games to be purged.`);
      }

      if (gameIds.length > 0) {
        console.log(`About to purge ${gameIds.length} games`);
        const placeholders = gameIds.map(() => '?').join(', ');
        const deleteResult = await this.asyncRun(`DELETE FROM games WHERE game_id in ( ${placeholders} )`, [...gameIds]);
        console.log(`Purged ${deleteResult.changes} rows from games`);
        const deleteParticipantsResult = await this.asyncRun(`DELETE FROM participants WHERE game_id in ( ${placeholders} )`, [...gameIds]);
        console.log(`Purged ${deleteParticipantsResult.changes} rows from participants`);
      }
      return gameIds;
    } else {
      return Promise.resolve([]);
    }
  }

  async compressCompletedGames(_compressCompletedGamesDays?: string): Promise<void> {
    // Only explicit archive maintenance may remove completed SQLite history.
  }

  async saveGame(game: IGame): Promise<void> {
    const thisSaveId = game.lastSaveId;
    assertSaveIdWithinLimit(thisSaveId, this.maxSavesPerGame);
    const gameJSON = JSON.stringify(game.serialize());

    // This app has a bad habit of re-saving the same state. It hasn't been fully cleaned, but OK.
    // If this is the first time we're saving the game, then store the participants. No need
    // to store them again.
    const isFirstSave = game.lastSaveId === 0 &&
      await this.asyncGet('SELECT 1 FROM games WHERE game_id = ? AND save_id = 0', [game.id]) === undefined;

    // Insert
    const sql = 'INSERT INTO games (game_id, save_id, game, players, created_time) VALUES (?, ?, ?, ?, strftime(\'%s\', \'now\')) ON CONFLICT (game_id, save_id) DO UPDATE SET game = ?';
    const params = [game.id, thisSaveId, gameJSON, game.players.length, gameJSON];
    if (this.archive.catalog.getBinding(game.id) === undefined) {
      await this.runQuietly(sql, params);
    } else {
      await this.archive.withHydratedHistory(game.id, () => {
        this.db.prepare(sql).run(params);
      });
    }

    if (isFirstSave) {
      const participantIds: Array<ParticipantId> = game.players.map(toID);
      if (game.spectatorId) {
        participantIds.push(game.spectatorId);
      }
      try {
        await this.storeParticipants({gameId: game.id, participantIds: participantIds});
      } catch (e) {
        console.error(e);
      }
    }

    // This must occur after the save.
    game.lastSaveId++;
  }

  async deleteGameNbrSaves(gameId: GameId, rollbackCount: number): Promise<void> {
    if (rollbackCount <= 0) {
      console.error(`invalid rollback count for ${gameId}: ${rollbackCount}`);
      // Should this be an error?
      return Promise.resolve();
    }
    const sql = 'DELETE FROM games WHERE rowid IN (SELECT rowid FROM games WHERE game_id = ? ORDER BY save_id DESC LIMIT ?)';
    if (this.archive.catalog.getBinding(gameId) === undefined) {
      return this.runQuietly(sql, [gameId, rollbackCount]);
    }
    await this.archive.withHydratedHistory(gameId, () => {
      this.db.prepare(sql).run(gameId, rollbackCount);
    });
  }

  public stats(): Promise<{[key: string]: string | number}> {
    const size = this.filename === IN_MEMORY_SQLITE_PATH ? -1 : fs.statSync(String(this.filename)).size;

    return Promise.resolve({
      type: 'SQLite',
      path: String(this.filename),
      size_bytes: size,
    });
  }

  public async storeParticipants(entry: GameIdLedger): Promise<void> {
    // Sequence of '(?, ?)' pairs.
    const placeholders = entry.participantIds.map(() => '(?, ?)').join(', ');
    // Sequence of [game_id, id] pairs.
    const values: Array<GameId | ParticipantId> = entry.participantIds.map((participant) => [entry.gameId, participant]).flat();

    await this.asyncRun('INSERT INTO participants (game_id, participant) VALUES ' + placeholders + ' ON CONFLICT (game_id, participant) DO NOTHING', values);
  }

  public async getParticipants(): Promise<Array<GameIdLedger>> {
    const rows = await this.asyncAll('SELECT game_id, participant FROM participants');
    const multimap = new MultiMap<GameId, ParticipantId>();
    rows.forEach((row) => multimap.set(row.game_id, row.participant));
    const result: Array<GameIdLedger> = [];
    multimap.forEachAssociation((participantIds, gameId) => {
      result.push({gameId, participantIds});
    });
    return result;
  }

  public async createSession(session: Session): Promise<void> {
    await this.asyncRun('INSERT INTO session (session_id, data, expiration_time) VALUES(?, ?, ?)', [session.id, JSON.stringify(session.data), session.expirationTimeMillis / 1000]);
  }

  public async deleteSession(sessionId: SessionId): Promise<void> {
    await this.asyncRun('DELETE FROM session where session_id = ?', [sessionId]);
  }

  async getSessions(): Promise<Array<Session>> {
    const selectResult = await this.asyncAll('SELECT session_id, data, expiration_time FROM session where expiration_time > ?', [Date.now() / 1000]);
    return selectResult.map((row) => {
      return {
        id: row.session_id,
        data: JSON.parse(row.data),
        expirationTimeMillis: row.expiration_time * 1000,
      };
    });
  }

  protected asyncRun(sql: string, params?: any): Promise<BetterSqlite3.RunResult> {
    try {
      const stmt = this.db.prepare(sql);
      const result = params !== undefined ? stmt.run(params) : stmt.run();
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  protected asyncGet(sql: string, params?: any): Promise<any> {
    try {
      const stmt = this.db.prepare(sql);
      const row = params !== undefined ? stmt.get(params) : stmt.get();
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  protected asyncAll(sql: string, params?: any): Promise<Array<any>> {
    try {
      const stmt = this.db.prepare(sql);
      const rows = params !== undefined ? stmt.all(params) : stmt.all();
      return Promise.resolve(rows as Array<any>);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Run the given SQL but do not return errors.
  protected async runQuietly(sql: string, params: any): Promise<void> {
    try {
      await this.asyncRun(sql, params);
    } catch (err) {
      console.error(err);
      console.error('for sql: ' + sql);
      if (this.throwQuietFailures) {
        throw err;
      }
    }
  }
}
