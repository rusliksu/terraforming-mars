import {expect} from 'chai';

import {GameId} from '../../src/common/Types';
import {
  ActionIdConflictError,
  ActionStoreError,
  ActionStoreErrorCode,
  RevisionConflictError,
} from '../../src/server/actionStore/errors';
import {computeActionEventHash, hashActionPayload} from '../../src/server/actionStore/canonical';
import {IActionStore} from '../../src/server/actionStore/IActionStore';
import {
  ActionIntent,
  AppendActionIntentRequest,
  OpenActionStreamRequest,
  PromptMetadata,
} from '../../src/server/actionStore/types';

export const CONTRACT_STATE_HASH = 'a'.repeat(64);
const OTHER_STATE_HASH = 'b'.repeat(64);

export type ActionStoreTestDescriptor = {
  name: string;
  createStore: () => IActionStore;
};

let gameSequence = 0;

export function newGameId(): GameId {
  gameSequence++;
  return `g-action-store-${process.pid}-${Date.now()}-${gameSequence}` as GameId;
}

export function makeOpenRequest(
  gameId: GameId,
  overrides: Partial<OpenActionStreamRequest> = {},
): OpenActionStreamRequest {
  return {
    gameId,
    genesisId: `genesis-${gameId}`,
    baseSaveId: 0,
    stateHash: CONTRACT_STATE_HASH,
    ...overrides,
  };
}

export function makeAppendRequest(
  gameId: GameId,
  overrides: Partial<AppendActionIntentRequest> = {},
): AppendActionIntentRequest {
  return {
    gameId,
    expectedRevision: 0,
    genesisId: `genesis-${gameId}`,
    epoch: 1,
    actionId: 'action-1',
    actorId: 'p1',
    intentType: 'player-input',
    payload: {type: 'option', index: 0},
    prompt: {
      promptId: 'prompt-1',
      promptType: 'SelectOption',
      promptFingerprint: 'prompt:abc123',
    },
    ...overrides,
  };
}

export async function expectActionStoreError<T>(
  promise: Promise<T>,
  code: ActionStoreErrorCode,
): Promise<ActionStoreError> {
  try {
    await promise;
  } catch (err) {
    expect(err).instanceOf(ActionStoreError);
    const error = err as ActionStoreError;
    expect(error.code).eq(code);
    return error;
  }
  throw new Error(`expected action store error ${code}, but the operation succeeded`);
}

export function expectedEventHash(intent: ActionIntent): string {
  return computeActionEventHash({
    gameId: intent.gameId,
    revision: intent.revision,
    epoch: intent.epoch,
    actionId: intent.actionId,
    actorId: intent.actorId,
    intentType: intent.intentType,
    payloadHash: intent.payloadHash,
    prompt: intent.prompt,
    genesisId: intent.genesisId,
    prevEventHash: intent.prevEventHash,
    recordedAtMs: intent.recordedAtMs,
  });
}

/**
 * Contract tests shared by every {@link IActionStore} implementation. Adapter
 * specs add only transport-specific tests (failure injection, live PostgreSQL).
 */
export function describeActionStoreSuite(descriptor: ActionStoreTestDescriptor): void {
  describe(descriptor.name, () => {
    let store: IActionStore;
    let gameId: GameId;

    beforeEach(async () => {
      store = descriptor.createStore();
      gameId = newGameId();
      await store.initialize();
    });

    afterEach(async () => {
      await store.close();
    });

    it('opens a genesis-anchored stream and treats a matching open as existing', async () => {
      const opened = await store.openStream(makeOpenRequest(gameId));
      expect(opened.status).eq('opened');
      expect(opened.stream.gameId).eq(gameId);
      expect(opened.stream.epoch).eq(1);
      expect(opened.stream.revision).eq(0);
      expect(opened.stream.genesisId).eq(`genesis-${gameId}`);
      expect(opened.stream.baseSaveId).eq(0);
      expect(opened.stream.stateHash).eq(CONTRACT_STATE_HASH);
      expect(opened.stream.genesisHash).match(/^[0-9a-f]{64}$/);
      expect(opened.stream.lastEventHash).eq(opened.stream.genesisHash);

      const again = await store.openStream(makeOpenRequest(gameId));
      expect(again.status).eq('existing');
      expect(again.stream.genesisHash).eq(opened.stream.genesisHash);
      expect(again.stream.createdAtMs).eq(opened.stream.createdAtMs);
    });

    it('rejects a stream reopened from a different genesis', async () => {
      const opened = await store.openStream(makeOpenRequest(gameId));

      await expectActionStoreError(
        store.openStream(makeOpenRequest(gameId, {stateHash: OTHER_STATE_HASH})),
        'GENESIS_MISMATCH',
      );

      const stream = await store.getStream(gameId);
      expect(stream!.genesisHash).eq(opened.stream.genesisHash);
    });

    it('rejects intents and fencing for an unknown game', async () => {
      await expectActionStoreError(store.appendIntent(makeAppendRequest(gameId)), 'STREAM_NOT_FOUND');
      await expectActionStoreError(store.fenceStream({gameId, expectedEpoch: 1}), 'STREAM_NOT_FOUND');
      expect(await store.getStream(gameId)).is.undefined;
      expect(await store.listIntents(gameId)).deep.eq([]);
    });

    it('appends an intent and exposes replay metadata', async () => {
      const opened = await store.openStream(makeOpenRequest(gameId));
      const payload = {input: {type: 'option', index: 2}, note: 'A'};
      const prompt: PromptMetadata = {
        promptId: 'prompt-7',
        promptType: 'OrOptions',
        promptFingerprint: 'prompt:deadbeef',
        promptIndex: 3,
      };

      const appended = await store.appendIntent(makeAppendRequest(gameId, {
        actionId: 'action-metadata',
        payload,
        prompt,
      }));

      expect(appended.status).eq('appended');
      expect(appended.intent.gameId).eq(gameId);
      expect(appended.intent.revision).eq(1);
      expect(appended.intent.epoch).eq(1);
      expect(appended.intent.genesisId).eq(`genesis-${gameId}`);
      expect(appended.intent.payload).deep.eq(payload);
      expect(appended.intent.payloadHash).eq(hashActionPayload(payload));
      expect(appended.intent.prompt).deep.eq(prompt);
      expect(appended.intent.prevEventHash).eq(opened.stream.genesisHash);
      expect(appended.intent.eventHash).eq(expectedEventHash(appended.intent));
      expect(appended.stream.revision).eq(1);
      expect(appended.stream.lastEventHash).eq(appended.intent.eventHash);

      const readBack = await store.getIntent(gameId, 'action-metadata');
      expect(readBack).deep.eq(appended.intent);
      expect(await store.getStream(gameId)).deep.eq(appended.stream);
    });

    it('chains revisions and reads replay windows in order', async () => {
      const opened = await store.openStream(makeOpenRequest(gameId));
      const first = await store.appendIntent(makeAppendRequest(gameId, {
        actionId: 'action-first',
        expectedRevision: 0,
        prompt: {promptId: 'prompt-1', promptType: 'SelectOption', promptFingerprint: 'prompt:one'},
      }));
      const second = await store.appendIntent(makeAppendRequest(gameId, {
        actionId: 'action-second',
        expectedRevision: 1,
        payload: {type: 'card', name: 'Algae'},
        prompt: {promptId: 'prompt-2', promptType: 'SelectCard', promptFingerprint: 'prompt:two'},
      }));

      expect(second.intent.prevEventHash).eq(first.intent.eventHash);
      expect(first.intent.prevEventHash).eq(opened.stream.genesisHash);
      expect(second.intent.eventHash).eq(expectedEventHash(second.intent));

      const stream = await store.getStream(gameId);
      expect(stream!.revision).eq(2);
      expect(stream!.lastEventHash).eq(second.intent.eventHash);

      const all = await store.listIntents(gameId);
      expect(all.map((intent) => intent.actionId)).deep.eq(['action-first', 'action-second']);
      expect(all.map((intent) => intent.revision)).deep.eq([1, 2]);
      expect(all[1].prompt).deep.eq(second.intent.prompt);
      expect(all[1].payload).deep.eq(second.intent.payload);

      const tail = await store.listIntents(gameId, {fromRevision: 2});
      expect(tail.map((intent) => intent.actionId)).deep.eq(['action-second']);

      const page = await store.listIntents(gameId, {limit: 1});
      expect(page.map((intent) => intent.actionId)).deep.eq(['action-first']);

      const beyondHead = await store.listIntents(gameId, {fromRevision: 99});
      expect(beyondHead).deep.eq([]);
    });

    it('returns the original intent for an exact duplicate action id', async () => {
      await store.openStream(makeOpenRequest(gameId));
      const first = await store.appendIntent(makeAppendRequest(gameId, {
        actionId: 'action-duplicate',
        expectedRevision: 0,
      }));

      // Same content, stale revision token: retries must stay idempotent.
      const retry = await store.appendIntent(makeAppendRequest(gameId, {
        actionId: 'action-duplicate',
        expectedRevision: 0,
      }));

      expect(retry.status).eq('duplicate');
      expect(retry.intent).deep.eq(first.intent);
      expect(retry.stream.revision).eq(1);
      expect((await store.listIntents(gameId)).length).eq(1);
    });

    it('rejects an action id reused with different content', async () => {
      await store.openStream(makeOpenRequest(gameId));
      const originalPayload = {choice: 'A'};
      const first = await store.appendIntent(makeAppendRequest(gameId, {
        actionId: 'action-conflict',
        payload: originalPayload,
      }));

      const conflict = await expectActionStoreError(
        store.appendIntent(makeAppendRequest(gameId, {
          actionId: 'action-conflict',
          expectedRevision: 1,
          payload: {choice: 'B'},
        })),
        'ACTION_ID_CONFLICT',
      );
      expect(conflict).instanceOf(ActionIdConflictError);
      expect((conflict as ActionIdConflictError).existingPayloadHash).eq(hashActionPayload(originalPayload));
      expect((conflict as ActionIdConflictError).incomingPayloadHash).eq(hashActionPayload({choice: 'B'}));

      // Same payload, different prompt metadata is also a conflicting reuse.
      await expectActionStoreError(
        store.appendIntent(makeAppendRequest(gameId, {
          actionId: 'action-conflict',
          expectedRevision: 1,
          payload: originalPayload,
          prompt: {promptId: 'prompt-other', promptType: 'SelectOption', promptFingerprint: 'prompt:other'},
        })),
        'ACTION_ID_CONFLICT',
      );

      expect((await store.listIntents(gameId)).length).eq(1);
      expect((await store.getIntent(gameId, 'action-conflict'))!.eventHash).eq(first.intent.eventHash);
    });

    it('allows exactly one of two writers racing for the same revision', async () => {
      await store.openStream(makeOpenRequest(gameId));

      const settled = await Promise.allSettled([
        store.appendIntent(makeAppendRequest(gameId, {actionId: 'race-one', expectedRevision: 0})),
        store.appendIntent(makeAppendRequest(gameId, {actionId: 'race-two', expectedRevision: 0})),
      ]);

      const fulfilled = settled.filter((result) => result.status === 'fulfilled');
      expect(fulfilled.length).eq(1);
      const rejected = settled.find((result) => result.status === 'rejected') as PromiseRejectedResult;
      expect((rejected.reason as ActionStoreError).code).eq('REVISION_CONFLICT');

      const stream = await store.getStream(gameId);
      expect(stream!.revision).eq(1);
      const intents = await store.listIntents(gameId);
      expect(intents.length).eq(1);
      expect(intents[0].revision).eq(1);
    });

    it('rejects a stale expected revision without writing', async () => {
      await store.openStream(makeOpenRequest(gameId));
      await store.appendIntent(makeAppendRequest(gameId, {actionId: 'action-first', expectedRevision: 0}));

      const original = await store.getIntent(gameId, 'action-first');
      const conflict = await expectActionStoreError(
        store.appendIntent(makeAppendRequest(gameId, {actionId: 'action-stale', expectedRevision: 0})),
        'REVISION_CONFLICT',
      );
      expect(conflict).instanceOf(RevisionConflictError);
      expect((conflict as RevisionConflictError).expectedRevision).eq(0);
      expect((conflict as RevisionConflictError).actualRevision).eq(1);

      expect((await store.listIntents(gameId)).length).eq(1);
      expect(await store.getIntent(gameId, 'action-stale')).is.undefined;
      expect((await store.getIntent(gameId, 'action-first'))!.eventHash).eq(original!.eventHash);
    });

    it('fences out writers holding a stale epoch', async () => {
      await store.openStream(makeOpenRequest(gameId));
      await store.appendIntent(makeAppendRequest(gameId, {actionId: 'epoch-one', expectedRevision: 0}));

      const fenced = await store.fenceStream({gameId, expectedEpoch: 1});
      expect(fenced.epoch).eq(2);
      expect(fenced.revision).eq(1);

      await expectActionStoreError(
        store.appendIntent(makeAppendRequest(gameId, {
          actionId: 'epoch-stale',
          expectedRevision: 1,
          epoch: 1,
        })),
        'STALE_EPOCH',
      );
      expect(await store.getIntent(gameId, 'epoch-stale')).is.undefined;

      const accepted = await store.appendIntent(makeAppendRequest(gameId, {
        actionId: 'epoch-two',
        expectedRevision: 1,
        epoch: 2,
      }));
      expect(accepted.status).eq('appended');
      expect(accepted.intent.epoch).eq(2);
      expect(accepted.intent.revision).eq(2);

      await expectActionStoreError(store.fenceStream({gameId, expectedEpoch: 1}), 'STALE_EPOCH');
    });

    it('validates intent input before touching the ledger', async () => {
      await store.openStream(makeOpenRequest(gameId));

      await expectActionStoreError(
        store.appendIntent(makeAppendRequest(gameId, {actionId: ''})),
        'INVALID_INTENT',
      );
      await expectActionStoreError(
        store.appendIntent(makeAppendRequest(gameId, {epoch: 0})),
        'INVALID_INTENT',
      );
      await expectActionStoreError(
        store.appendIntent(makeAppendRequest(gameId, {
          payload: {bad: undefined} as unknown as AppendActionIntentRequest['payload'],
        })),
        'INVALID_INTENT',
      );

      expect(await store.listIntents(gameId)).deep.eq([]);
      expect((await store.getStream(gameId))!.revision).eq(0);
    });

    it('validates replay query options', async () => {
      await store.openStream(makeOpenRequest(gameId));

      await expectActionStoreError(store.listIntents(gameId, {limit: 0}), 'INVALID_QUERY');
      await expectActionStoreError(store.listIntents(gameId, {limit: 1001}), 'INVALID_QUERY');
      await expectActionStoreError(store.listIntents(gameId, {fromRevision: 0}), 'INVALID_QUERY');
    });
  });
}
