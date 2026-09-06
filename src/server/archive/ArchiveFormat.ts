import {createHash} from 'node:crypto';

// Null is preserved serialized data, not an absent runtime value.
export type Json = null | boolean | number | string | Array<Json> | {[key: string]: Json};
export const LIMITS = Object.freeze({
  stateBytes: 8 * 1024 * 1024, groupBytes: 64 * 1024 * 1024,
  manifestBytes: 4 * 1024 * 1024, totalBytes: 512 * 1024 * 1024,
  compressedBytes: 128 * 1024 * 1024, records: 4096, groupRecords: 20,
  depth: 128, operations: 100000,
});
export type ErrorCode = 'ARCHIVE_CORRUPT' | 'LIMIT_EXCEEDED' | 'SAVE_NOT_RECORDED' |
  'UNSUPPORTED_ARCHIVE_VERSION' | 'SOURCE_NOT_COMPLETED' | 'SOURCE_HISTORY_EMPTY' |
  'SOURCE_UNSUPPORTED' | 'SOURCE_CHANGED' | 'ARCHIVE_CONFLICT' | 'IO_FAILURE';
export class ArchiveError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
  }
}
export function requireArchive(condition: unknown, code: ErrorCode = 'ARCHIVE_CORRUPT'): asserts condition {
  if (!condition) {
    throw new ArchiveError(code);
  }
}
export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}
export function digest(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
export function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

/** Encodes inert JSON with sorted keys and a finite byte budget. */
export function canonical(value: unknown, maxBytes: number = LIMITS.stateBytes, envelopeDepth = 0): string {
  requireArchive(integer(maxBytes, LIMITS.totalBytes) && maxBytes > 0, 'LIMIT_EXCEEDED');
  requireArchive(integer(envelopeDepth, 8));
  const chunks: Array<string> = [];
  const ancestors = new Set<object>();
  let bytes = 0;
  const emit = (text: string) => {
    bytes += Buffer.byteLength(text);
    requireArchive(bytes <= maxBytes, 'LIMIT_EXCEEDED');
    chunks.push(text);
  };
  const visit = (node: unknown, depth: number): void => {
    requireArchive(depth <= LIMITS.depth + envelopeDepth, 'LIMIT_EXCEEDED');
    if (node === null || typeof node === 'boolean' || typeof node === 'number' || typeof node === 'string') {
      requireArchive(typeof node !== 'number' || Number.isFinite(node));
      if (typeof node === 'string') {
        requireArchive(node.length <= maxBytes, 'LIMIT_EXCEEDED');
      }
      emit(JSON.stringify(node));
      return;
    }
    requireArchive(typeof node === 'object' && node !== null && !ancestors.has(node));
    requireArchive(Array.isArray(node) || Object.getPrototypeOf(node) === Object.prototype || Object.getPrototypeOf(node) === null);
    ancestors.add(node);
    const keys = Object.keys(node);
    requireArchive(Reflect.ownKeys(node).length === keys.length + (Array.isArray(node) ? 1 : 0));
    if (Array.isArray(node)) {
      requireArchive(keys.length === node.length);
      emit('[');
      for (let i = 0; i < node.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(node, i);
        requireArchive(descriptor && 'value' in descriptor);
        if (i > 0) {
          emit(',');
        }
        visit(descriptor.value, depth + 1);
      }
      emit(']');
    } else {
      emit('{');
      let first = true;
      for (const key of keys.sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(node, key);
        requireArchive(descriptor && 'value' in descriptor);
        if (!first) {
          emit(',');
        }
        first = false;
        requireArchive(key.length <= maxBytes, 'LIMIT_EXCEEDED');
        emit(JSON.stringify(key));
        emit(':');
        visit(descriptor.value, depth + 1);
      }
      emit('}');
    }
    ancestors.delete(node);
  };
  visit(value, 0);
  return chunks.join('');
}

export function parseJson(bytes: Buffer, maxBytes: number): unknown {
  requireArchive(bytes.length <= maxBytes, 'LIMIT_EXCEEDED');
  try {
    const text = bytes.toString('utf8');
    requireArchive(Buffer.from(text).equals(bytes));
    return JSON.parse(text);
  } catch {
    throw new ArchiveError('ARCHIVE_CORRUPT');
  }
}
export type StateIndex = {saveId: number; stateHash: string};
export type SourceMetadata = {kind: 'files' | 'sqlite'; schema: string; engineRevision: string};
export type Coverage = {
  firstSaveId: number; lastSaveId: number; gaps: Array<{first: number; last: number}>;
  startsAtZero: boolean; endsAtCompletedState: true; actionCoverage: 'unknown';
};
export function coverageOf(entries: ReadonlyArray<StateIndex>): Coverage {
  requireArchive(entries.length > 0 && entries.length <= LIMITS.records);
  const gaps: Coverage['gaps'] = [];
  let previous = -1;
  for (const entry of entries) {
    requireArchive(integer(entry.saveId) && entry.saveId > previous && isHash(entry.stateHash));
    if (previous >= 0 && entry.saveId - previous > 1) {
      gaps.push({first: previous + 1, last: entry.saveId - 1});
    }
    previous = entry.saveId;
  }
  return {firstSaveId: entries[0].saveId, lastSaveId: previous, gaps,
    startsAtZero: entries[0].saveId === 0, endsAtCompletedState: true, actionCoverage: 'unknown'};
}
export function sourceDigest(source: SourceMetadata, entries: ReadonlyArray<StateIndex>): string {
  return digest(canonical({source, entries}, LIMITS.manifestBytes));
}
export type GroupDescriptor = {
  ordinal: number; firstSaveId: number; lastSaveId: number; count: number;
  compressedBytes: number; decodedBytes: number; compressedHash: string; entries: Array<StateIndex>;
};
export type Manifest = {
  format: 'tm-history-archive'; version: 1; codec: 'structural-json-v1'; compression: 'gzip';
  canonicalEncoding: 'tm-json-v1'; source: SourceMetadata; sourceDigest: string;
  coverage: Coverage; count: number; groups: Array<GroupDescriptor>;
};
export function groupFilename(ordinal: number): string {
  requireArchive(integer(ordinal, LIMITS.records - 1));
  return `group-${ordinal.toString().padStart(4, '0')}.json.gz`;
}
