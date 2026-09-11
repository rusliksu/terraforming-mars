import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {IGame} from '../../../src/server/IGame';
import {LocalFilesystem} from '../../../src/server/database/LocalFilesystem';
import {SQLite} from '../../../src/server/database/SQLite';
import {assertSaveIdWithinLimit, resolveMaxSavesPerGame} from '../../../src/server/database/HistoryLimits';

function fakeGame(id: string, saveId: number): IGame {
  return {
    id,
    lastSaveId: saveId,
    players: [{}],
    serialize: () => ({id, lastSaveId: saveId} as any),
  } as unknown as IGame;
}

describe('HistoryLimits', () => {
  it('rejects invalid or unbounded configuration', () => {
    assert.equal(resolveMaxSavesPerGame(undefined), 2048);
    assert.equal(resolveMaxSavesPerGame(4096), 4096);
    assert.throws(() => resolveMaxSavesPerGame(0), {code: 'HISTORY_LIMIT_CONFIG_INVALID'});
    assert.throws(() => resolveMaxSavesPerGame(Infinity), {code: 'HISTORY_LIMIT_CONFIG_INVALID'});
    assert.throws(() => resolveMaxSavesPerGame(4097), {code: 'HISTORY_LIMIT_CONFIG_INVALID'});
    assert.throws(() => assertSaveIdWithinLimit(0, 0), {code: 'HISTORY_LIMIT_CONFIG_INVALID'});
    assert.throws(() => assertSaveIdWithinLimit(2, 2), {code: 'HISTORY_LIMIT_EXCEEDED'});
  });

  it('fails closed before SQLite can append beyond the configured limit', async () => {
    const database = new SQLite(':memory:', true, 2);
    await database.initialize();
    const game = fakeGame('g-history-limit', 0);

    await database.saveGame(game);
    assert.equal(game.lastSaveId, 1);
    game.lastSaveId = 2;
    await assert.rejects(database.saveGame(game), {code: 'HISTORY_LIMIT_EXCEEDED'});
    assert.deepEqual(await database.getSaveIds(game.id), [0]);
  });

  it('fails closed before the local filesystem backend writes a new history file', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-history-limit-'));
    try {
      const database = new LocalFilesystem(root, 2);
      await database.initialize();
      const game = fakeGame('g-history-limit-files', 0);
      await database.saveGame(game);
      game.lastSaveId = 2;
      assert.throws(() => database.saveGame(game), {code: 'HISTORY_LIMIT_EXCEEDED'});
      assert.deepEqual(await database.getSaveIds(game.id), [0]);
    } finally {
      fs.rmSync(root, {recursive: true, force: true});
    }
  });
});
