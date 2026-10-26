import {expect} from 'chai';
import {canonical, Json, LIMITS} from '@/server/archive/ArchiveFormat';
import {applyOperations, makeRecord, restoreRecord} from '@/server/archive/ArchiveCodec';

describe('ArchiveCodec', () => {
  it('pins canonical bytes without losing null, Unicode or numeric object keys', () => {
    const value = JSON.parse('{"2":null,"10":"я","a":[-0,true,"\\ud800"],"__proto__":{"x":1}}');
    expect(canonical(value)).eq('{"10":"я","2":null,"__proto__":{"x":1},"a":[0,true,"\\ud800"]}');
  });

  it('applies typed paths, suffix replacement and own hostile keys without changing the base', () => {
    const base = {log: ['old', 'discard'], obsolete: true};
    const result = applyOperations(base, [
      {op: 'tail', path: ['log'], start: 1, values: ['new', null]},
      {op: 'remove', path: ['obsolete']},
      {op: 'set', path: ['__proto__'], value: {polluted: true}},
    ]);
    expect(canonical(result)).eq('{"__proto__":{"polluted":true},"log":["old","new",null]}');
    expect(base).deep.eq({log: ['old', 'discard'], obsolete: true});
    expect(Object.prototype).not.have.property('polluted');
  });

  it('round trips structural changes and chooses a checkpoint when a delta costs more', () => {
    const base = {stable: 's'.repeat(1000), log: [{message: 'start'}], remove: 42};
    const next = {stable: 's'.repeat(1000), log: [{message: 'start'}, {message: 'end'}], extension: null};
    const first = makeRecord(3, base);
    const second = makeRecord(7, next, {saveId: 3, state: base});
    expect(second.kind).eq('delta');
    expect(restoreRecord(second, {saveId: 3, state: base})).deep.eq(next);
    expect(restoreRecord(first)).deep.eq(base);
    expect(makeRecord(8, 0, {saveId: 7, state: next}).kind).eq('full');
    expect(() => restoreRecord(second, {saveId: 4, state: base})).to.throw('ARCHIVE_CORRUPT');
  });

  it('uses a full record when repeated delta paths exceed the byte budget', () => {
    let before: Json = Object.fromEntries(Array.from({length: 1000}, (_, i) => ['v' + i, 0]));
    let after: Json = Object.fromEntries(Array.from({length: 1000}, (_, i) => ['v' + i, 1]));
    for (let i = 0; i < 80; i++) {
      const key = 'k' + i + 'x'.repeat(997);
      before = {[key]: before};
      after = {[key]: after};
    }
    const record = makeRecord(1, after, {saveId: 0, state: before});
    expect(record.kind).eq('full');
    expect(restoreRecord(record)).deep.eq(after);
  });

  it('rejects malformed operations, inherited traversal and sparse array writes', () => {
    for (const operations of [
      [{op: 'set', path: ['constructor', 'prototype', 'x'], value: 1}],
      [{op: 'set', path: ['a', 2], value: 1}],
      [{op: 'set', path: ['a', '0'], value: 1}],
      [{op: 'remove', path: ['a', 0]}],
      [{op: 'tail', path: ['a'], start: -1, values: []}],
      [{op: 'remove', path: []}],
      [{op: 'unknown', path: []}],
    ]) {
      expect(() => applyOperations({a: [0]}, operations)).to.throw('ARCHIVE_CORRUPT');
    }
  });

  it('rejects non-JSON, cycles, accessors and resource excess without evaluating data', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const accessor = Object.defineProperty({}, 'x', {enumerable: true, get: () => {
      throw new Error('private');
    }});
    for (const value of [undefined, NaN, Infinity, new Date(), cycle, accessor, [undefined]]) {
      expect(() => canonical(value)).to.throw('ARCHIVE_CORRUPT');
    }
    let deep: unknown = 1;
    for (let i = 0; i < 130; i++) {
      deep = [deep];
    }
    expect(() => canonical(deep)).to.throw('LIMIT_EXCEEDED');
    expect(() => canonical('x'.repeat(LIMITS.stateBytes))).to.throw('LIMIT_EXCEEDED');
  });

  it('allows a maximum-depth state inside a record envelope', () => {
    let state: Json = 0;
    for (let i = 0; i < LIMITS.depth; i++) {
      state = [state];
    }
    const record = makeRecord(2, state, {saveId: 1, state: 1});
    expect(canonical(restoreRecord(record))).eq(canonical(state));
  });
});
