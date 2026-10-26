import {expect} from 'chai';

import {
  canonicalJson,
  computeActionEventHash,
  computeGenesisHash,
  hashActionPayload,
} from '../../src/server/actionStore/canonical';
import {InvalidActionIntentError} from '../../src/server/actionStore/errors';

describe('action store canonical hashing', () => {
  it('is insensitive to object key order and preserves array order', () => {
    expect(canonicalJson({b: 2, a: {d: 4, c: 3}})).eq('{"a":{"c":3,"d":4},"b":2}');
    expect(hashActionPayload({b: 2, a: 1})).eq(hashActionPayload({a: 1, b: 2}));
    expect(hashActionPayload({a: [1, 2]})).not.eq(hashActionPayload({a: [2, 1]}));
    expect(hashActionPayload({a: 1})).match(/^[0-9a-f]{64}$/);
  });

  it('rejects values that cannot round-trip through JSON', () => {
    const payloads: Array<unknown> = [
      undefined,
      NaN,
      Infinity,
      () => 1,
      new Date(),
      {a: undefined},
      {a: 1n},
    ];
    for (const payload of payloads) {
      expect(() => hashActionPayload(payload)).to.throw(InvalidActionIntentError);
    }
  });

  it('binds the event hash to prevEventHash and the genesis hash to the save anchor', () => {
    const base = {
      gameId: 'g-hash' as const,
      revision: 1,
      epoch: 1,
      actionId: 'action-1',
      actorId: 'p1',
      intentType: 'player-input',
      payloadHash: hashActionPayload({a: 1}),
      prompt: null,
      genesisId: 'genesis-1',
      recordedAtMs: 1000,
    };
    const first = computeActionEventHash({...base, prevEventHash: '0'.repeat(64)});
    const second = computeActionEventHash({...base, prevEventHash: '1'.repeat(64)});
    expect(first).match(/^[0-9a-f]{64}$/);
    expect(first).not.eq(second);

    const genesisA = computeGenesisHash({
      gameId: 'g-hash',
      genesisId: 'genesis-1',
      baseSaveId: 0,
      stateHash: 'a'.repeat(64),
    });
    const genesisB = computeGenesisHash({
      gameId: 'g-hash',
      genesisId: 'genesis-1',
      baseSaveId: 1,
      stateHash: 'a'.repeat(64),
    });
    expect(genesisA).not.eq(genesisB);
  });
});
