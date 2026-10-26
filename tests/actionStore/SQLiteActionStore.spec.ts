import {expect} from 'chai';

import {
  IN_MEMORY_ACTION_STORE_PATH,
  SQLiteActionStore,
} from '../../src/server/actionStore/SQLiteActionStore';
import {describeActionStoreSuite, makeAppendRequest, makeOpenRequest, newGameId} from './actionStoreSuite';

class TestSQLiteActionStore extends SQLiteActionStore {
  public get rawDatabase() {
    return this.db;
  }
}

describeActionStoreSuite({
  name: 'SQLiteActionStore',
  createStore: () => new TestSQLiteActionStore(IN_MEMORY_ACTION_STORE_PATH),
});

describe('SQLiteActionStore failure injection', () => {
  it('rolls back the intent when the stream head update fails', async () => {
    const store = new TestSQLiteActionStore(IN_MEMORY_ACTION_STORE_PATH);
    await store.initialize();
    try {
      const gameId = newGameId();
      await store.openStream(makeOpenRequest(gameId));
      store.rawDatabase.exec(
        `CREATE TRIGGER fail_action_stream_update
          BEFORE UPDATE ON action_stream
          WHEN OLD.game_id = '${gameId}'
          BEGIN
            SELECT RAISE(ABORT, 'injected stream head failure');
          END`,
      );

      let caught: unknown;
      try {
        await store.appendIntent(makeAppendRequest(gameId, {actionId: 'action-failure'}));
      } catch (err) {
        caught = err;
      }

      expect(caught).instanceOf(Error);
      expect((caught as Error).message).contains('injected stream head failure');
      expect(await store.getIntent(gameId, 'action-failure')).is.undefined;
      expect(await store.listIntents(gameId)).deep.eq([]);
      expect((await store.getStream(gameId))!.revision).eq(0);

      const rowCount = (store.rawDatabase.prepare(
        'SELECT COUNT(*) AS row_count FROM action_intent WHERE game_id = ?',
      ).get(gameId) as {row_count: number}).row_count;
      expect(rowCount).eq(0);
    } finally {
      await store.close();
    }
  });

  it('keeps the last committed intent when the next append fails', async () => {
    const store = new TestSQLiteActionStore(IN_MEMORY_ACTION_STORE_PATH);
    await store.initialize();
    try {
      const gameId = newGameId();
      await store.openStream(makeOpenRequest(gameId));
      const first = await store.appendIntent(makeAppendRequest(gameId, {actionId: 'action-good'}));
      store.rawDatabase.exec(
        `CREATE TRIGGER fail_next_action_intent_insert
          BEFORE INSERT ON action_intent
          WHEN NEW.action_id = 'action-bad'
          BEGIN
            SELECT RAISE(ABORT, 'injected insert failure');
          END`,
      );

      let caught: unknown;
      try {
        await store.appendIntent(makeAppendRequest(gameId, {
          actionId: 'action-bad',
          expectedRevision: 1,
        }));
      } catch (err) {
        caught = err;
      }

      expect(caught).instanceOf(Error);
      expect((caught as Error).message).contains('injected insert failure');
      const intents = await store.listIntents(gameId);
      expect(intents.map((intent) => intent.actionId)).deep.eq(['action-good']);
      expect(intents[0].eventHash).eq(first.intent.eventHash);
      expect((await store.getStream(gameId))!.revision).eq(1);
    } finally {
      await store.close();
    }
  });
});
