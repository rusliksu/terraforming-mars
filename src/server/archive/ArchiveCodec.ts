import {ArchiveError, canonical, digest, integer, Json, LIMITS, object, requireArchive} from '@/server/archive/ArchiveFormat';

type Path = Array<string | number>;
type Operation = {op: 'set'; path: Path; value: Json} | {op: 'remove'; path: Path} |
  {op: 'tail'; path: Path; start: number; values: Array<Json>};
export type SavedState = {saveId: number; state: Json};
export type StateRecord = {kind: 'full'; saveId: number; stateHash: string; state: Json} |
  {kind: 'delta'; saveId: number; baseSaveId: number; baseStateHash: string; stateHash: string; operations: Array<Operation>};
const clone = (value: unknown): Json => JSON.parse(canonical(value));

function child(node: Json, key: string | number): Json {
  requireArchive(node !== null && typeof node === 'object');
  requireArchive(Array.isArray(node) ? integer(key, node.length - 1) : typeof key === 'string');
  requireArchive(Object.hasOwn(node, key));
  return (node as Record<string | number, Json>)[key];
}

/** Applies validated structural effects to a private copy of a state. */
export function applyOperations(base: Json, input: unknown): Json {
  requireArchive(Array.isArray(input) && input.length <= LIMITS.operations);
  // Bounds operation values before cloning or applying any expansion.
  canonical(input, LIMITS.groupBytes, 3);
  let root = clone(base);
  for (const operation of input) {
    requireArchive(object(operation) && Array.isArray(operation.path) && operation.path.length <= LIMITS.depth);
    requireArchive(operation.path.every((part) => typeof part === 'string' || integer(part)));
    const path = operation.path as Path;
    if (operation.op === 'tail') {
      requireArchive(Object.keys(operation).sort().join(',') === 'op,path,start,values');
      let target = root;
      for (const key of path) {
        target = child(target, key);
      }
      requireArchive(Array.isArray(target) && integer(operation.start, target.length) && Array.isArray(operation.values));
      const values = clone(operation.values);
      requireArchive(Array.isArray(values));
      target.length = operation.start;
      for (const value of values) {
        target.push(value);
      }
    } else {
      requireArchive(operation.op === 'set' || operation.op === 'remove');
      requireArchive(Object.keys(operation).sort().join(',') === (operation.op === 'set' ? 'op,path,value' : 'op,path'));
      if (path.length === 0) {
        requireArchive(operation.op === 'set');
        root = clone(operation.value);
      } else {
        let parent = root;
        for (const key of path.slice(0, -1)) {
          parent = child(parent, key);
        }
        const key = path[path.length - 1];
        requireArchive(parent !== null && typeof parent === 'object');
        if (operation.op === 'remove') {
          requireArchive(!Array.isArray(parent) && typeof key === 'string' && Object.hasOwn(parent, key));
          delete parent[key];
        } else {
          requireArchive(Array.isArray(parent) ? integer(key, parent.length - 1) : typeof key === 'string');
          Object.defineProperty(parent, key, {value: clone(operation.value), enumerable: true, writable: true, configurable: true});
        }
      }
    }
  }
  canonical(root);
  return root;
}

function changes(before: Json, after: Json, path: Path, output: Array<Operation>): void {
  if (canonical(before) === canonical(after)) {
    return;
  }
  if (output.length > LIMITS.operations) {
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) {
      let start = 0;
      while (start < Math.min(before.length, after.length) && canonical(before[start]) === canonical(after[start])) {
        start++;
      }
      output.push({op: 'tail', path, start, values: after.slice(start)});
    } else {
      for (let i = 0; i < before.length; i++) {
        changes(before[i], after[i], path.concat(i), output);
      }
    }
  } else if (object(before) && object(after)) {
    for (const key of Object.keys(before).sort()) {
      if (!Object.hasOwn(after, key)) {
        output.push({op: 'remove', path: path.concat(key)});
      }
    }
    for (const key of Object.keys(after).sort()) {
      if (Object.hasOwn(before, key)) {
        changes(before[key] as Json, after[key] as Json, path.concat(key), output);
      } else {
        output.push({op: 'set', path: path.concat(key), value: after[key] as Json});
      }
    }
  } else {
    output.push({op: 'set', path, value: after});
  }
}

export function makeRecord(saveId: number, state: Json, previous?: SavedState): StateRecord {
  requireArchive(integer(saveId));
  const stateHash = digest(canonical(state));
  const full: StateRecord = {kind: 'full', saveId, stateHash, state};
  if (!previous) {
    return full;
  }
  requireArchive(integer(previous.saveId) && previous.saveId < saveId);
  const operations: Array<Operation> = [];
  const baseStateHash = digest(canonical(previous.state));
  changes(previous.state, state, [], operations);
  if (operations.length > LIMITS.operations) {
    return full;
  }
  const delta: StateRecord = {kind: 'delta', saveId, baseSaveId: previous.saveId, baseStateHash, stateHash, operations};
  const fullBytes = Buffer.byteLength(canonical(full, LIMITS.groupBytes, 1));
  try {
    return Buffer.byteLength(canonical(delta, fullBytes, 4)) < fullBytes ? delta : full;
  } catch (error) {
    if (error instanceof ArchiveError && error.code === 'LIMIT_EXCEEDED') {
      return full;
    }
    throw error;
  }
}

export function restoreRecord(record: unknown, previous?: SavedState): Json {
  requireArchive(object(record) && integer(record.saveId));
  let state: Json;
  if (record.kind === 'full') {
    requireArchive(Object.keys(record).sort().join(',') === 'kind,saveId,state,stateHash');
    state = clone(record.state);
  } else {
    requireArchive(record.kind === 'delta' && previous && record.baseSaveId === previous.saveId && record.saveId > previous.saveId);
    requireArchive(Object.keys(record).sort().join(',') === 'baseSaveId,baseStateHash,kind,operations,saveId,stateHash');
    requireArchive(record.baseStateHash === digest(canonical(previous.state)));
    state = applyOperations(previous.state, record.operations);
  }
  requireArchive(record.stateHash === digest(canonical(state)));
  return state;
}
