import {expect} from 'chai';

import {InMemoryActionStore} from '../../src/server/actionStore/InMemoryActionStore';
import {describeActionStoreSuite} from './actionStoreSuite';

describeActionStoreSuite({
  name: 'InMemoryActionStore',
  createStore: () => new InMemoryActionStore(),
});

describe('InMemoryActionStore failure injection', () => {
  it('leaves no partial intent when the post-insert hook throws', async () => {
    let shouldFail = true;
    const store = new InMemoryActionStore({
      afterIntentInsert: () => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('injected after-insert failure');
        }
      },
    });
    await store.initialize();
    try {
      const gameId = 'g-failure-injection' as const;
      await store.openStream({
        gameId,
        genesisId: 'genesis-failure',
        baseSaveId: 0,
        stateHash: 'a'.repeat(64),
      });

      let caught: unknown;
      try {
        await store.appendIntent({
          gameId,
          expectedRevision: 0,
          genesisId: 'genesis-failure',
          epoch: 1,
          actionId: 'action-failure',
          actorId: 'p1',
          intentType: 'player-input',
          payload: {type: 'option', index: 0},
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).instanceOf(Error);
      expect((caught as Error).message).eq('injected after-insert failure');
      expect(await store.getIntent(gameId, 'action-failure')).is.undefined;
      expect(await store.listIntents(gameId)).deep.eq([]);
      expect((await store.getStream(gameId))!.revision).eq(0);

      // The rolled-back store is still usable.
      const retry = await store.appendIntent({
        gameId,
        expectedRevision: 0,
        genesisId: 'genesis-failure',
        epoch: 1,
        actionId: 'action-failure',
        actorId: 'p1',
        intentType: 'player-input',
        payload: {type: 'option', index: 0},
      });
      expect(retry.status).eq('appended');
      expect((await store.getStream(gameId))!.revision).eq(1);
    } finally {
      await store.close();
    }
  });
});
