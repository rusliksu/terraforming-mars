import {expect} from 'chai';
import type {GameId} from '../../src/common/Types';
import type {IActionStore} from '../../src/server/actionStore/IActionStore';
import type {AppendActionIntentRequest, OpenActionStreamRequest} from '../../src/server/actionStore/types';
import {
  ActionIdConflictError,
  InMemoryActionStore,
  RevisionConflictError,
  SQLiteActionStore,
  StaleEpochError,
  computeGenesisHash,
  sha256Hex,
} from '../../src/server/actionStore';

const GAME_ID: GameId = 'g1';
const GENESIS_ID = 'g1-genesis-0';
const STATE_HASH = sha256Hex('legacy-state-0');

function openRequest(): OpenActionStreamRequest {
  return {gameId: GAME_ID, genesisId: GENESIS_ID, baseSaveId: 0, stateHash: STATE_HASH};
}

function intent(overrides: Partial<AppendActionIntentRequest> = {}): AppendActionIntentRequest {
  return {
    gameId: GAME_ID,
    expectedRevision: 0,
    genesisId: GENESIS_ID,
    epoch: 1,
    actionId: 'action-1',
    actorId: 'p1',
    intentType: 'option',
    payload: {type: 'option'},
    prompt: {
      promptId: 'prompt-1',
      promptType: 'SelectOption',
      promptFingerprint: sha256Hex('prompt-1'),
    },
    ...overrides,
  };
}

async function suite(name: string, makeStore: () => Promise<IActionStore>): Promise<void> {
  describe(name, () => {
    let store: IActionStore;
    beforeEach(async () => {
      store = await makeStore();
      await store.initialize();
      await store.openStream(openRequest());
    });
    afterEach(async () => {
      await store.close();
    });

    it('opens an immutable genesis and appends revision 1', async () => {
      const opened = await store.openStream(openRequest());
      expect(opened.status).eq('existing');
      expect(opened.stream.revision).eq(0);
      expect(opened.stream.genesisHash).eq(computeGenesisHash({
        gameId: GAME_ID,
        genesisId: GENESIS_ID,
        baseSaveId: 0,
        stateHash: STATE_HASH,
      }));

      const result = await store.appendIntent(intent());
      expect(result.status).eq('appended');
      expect(result.intent.revision).eq(1);
      expect(result.intent.prevEventHash).eq(opened.stream.genesisHash);
      expect(result.stream.revision).eq(1);
      expect(result.stream.lastEventHash).eq(result.intent.eventHash);
      expect(await store.getIntent(GAME_ID, 'action-1')).deep.eq(result.intent);
    });

    it('returns a duplicate without a second effect', async () => {
      const first = await store.appendIntent(intent());
      const second = await store.appendIntent(intent());
      expect(second.status).eq('duplicate');
      expect(second.intent.revision).eq(first.intent.revision);
      expect(second.stream.revision).eq(1);
      expect(await store.listIntents(GAME_ID)).length(1);
    });

    it('rejects actionId reuse with different content', async () => {
      await store.appendIntent(intent());
      let caught: unknown;
      try {
        await store.appendIntent(intent({payload: {type: 'amount', amount: 2}}));
      } catch (err) {
        caught = err;
      }
      expect(caught).instanceOf(ActionIdConflictError);
    });

    it('rejects a stale revision instead of overwriting', async () => {
      await store.appendIntent(intent());
      let caught: unknown;
      try {
        await store.appendIntent(intent({actionId: 'action-2'}));
      } catch (err) {
        caught = err;
      }
      expect(caught).instanceOf(RevisionConflictError);
      expect((await store.getStream(GAME_ID))?.revision).eq(1);
    });

    it('fences old epochs and keeps the chain intact', async () => {
      const first = await store.appendIntent(intent());
      const fenced = await store.fenceStream({gameId: GAME_ID, expectedEpoch: 1});
      expect(fenced.epoch).eq(2);
      let caught: unknown;
      try {
        await store.appendIntent(intent({
          actionId: 'action-2',
          expectedRevision: 1,
          epoch: 1,
          payload: {type: 'amount', amount: 2},
        }));
      } catch (err) {
        caught = err;
      }
      expect(caught).instanceOf(StaleEpochError);

      const second = await store.appendIntent(intent({
        actionId: 'action-2',
        expectedRevision: 1,
        epoch: 2,
        payload: {type: 'amount', amount: 2},
      }));
      expect(second.intent.prevEventHash).eq(first.intent.eventHash);
      expect(second.intent.epoch).eq(2);
    });

    it('rejects invalid payloads before writing', async () => {
      let caught: unknown;
      try {
        await store.appendIntent(intent({payload: undefined}));
      } catch (err) {
        caught = err;
      }
      expect(caught).to.have.property('code', 'INVALID_INTENT');
      expect((await store.getStream(GAME_ID))?.revision).eq(0);
    });
  });
}

describe('Action store', () => {
  suite('in-memory CAS and idempotency', async () => new InMemoryActionStore({now: () => 1000}));
  suite('SQLite CAS and idempotency', async () => new SQLiteActionStore(':memory:', {now: () => 1000}));

  it('in-memory failure injection rolls back the staged intent', async () => {
    const store = new InMemoryActionStore({
      now: () => 1000,
      afterIntentInsert: () => {
        throw new Error('injected');
      },
    });
    await store.initialize();
    await store.openStream(openRequest());
    let caught: unknown;
    try {
      await store.appendIntent(intent());
    } catch (err) {
      caught = err;
    }
    expect(caught).to.be.instanceOf(Error);
    expect((await store.getStream(GAME_ID))?.revision).eq(0);
    expect(await store.listIntents(GAME_ID)).deep.eq([]);
    await store.close();
  });
});
