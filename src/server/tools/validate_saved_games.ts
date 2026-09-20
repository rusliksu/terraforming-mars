require('dotenv').config();

import path from 'node:path';
import BetterSqlite3 = require('better-sqlite3');
import {globalInitialize} from '../globalInitialize';
import {SerializedGameRow, validateSerializedGameRows} from '../database/SaveCorpusValidator';

function databasePath(argv: ReadonlyArray<string>): string {
  if (argv.length !== 1 || argv[0].trim() === '') {
    throw new Error('Usage: node build/src/server/tools/validate_saved_games.js <sqlite-path>');
  }
  return path.resolve(argv[0]);
}

function readLatestSaves(filename: string): Array<SerializedGameRow> {
  const database = new BetterSqlite3(filename, {readonly: true, fileMustExist: true});
  try {
    database.pragma('query_only = ON');
    return database.prepare(`
      SELECT latest.game_id AS gameId, latest.game AS serialized
      FROM games AS latest
      INNER JOIN (
        SELECT game_id, MAX(save_id) AS max_save_id
        FROM games
        GROUP BY game_id
      ) AS latest_save
        ON latest.game_id = latest_save.game_id
       AND latest.save_id = latest_save.max_save_id
      ORDER BY latest.game_id
    `).all() as Array<SerializedGameRow>;
  } finally {
    database.close();
  }
}

function main(): void {
  const filename = databasePath(process.argv.slice(2));
  globalInitialize();
  const summary = validateSerializedGameRows(readLatestSaves(filename));
  console.log(JSON.stringify(summary));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Save corpus validation failed.');
  process.exitCode = 1;
}
