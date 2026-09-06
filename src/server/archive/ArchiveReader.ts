import {lstat, open, realpath} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {ArchiveError, canonical, coverageOf, digest, GroupDescriptor, groupFilename, integer,
  isHash, Json, LIMITS, Manifest, object, parseJson, requireArchive, sourceDigest, StateIndex} from '@/server/archive/ArchiveFormat';
import {restoreRecord, SavedState} from '@/server/archive/ArchiveCodec';

/** Refuses linked path components before accessing a trusted local archive. */
export async function checkedPath(path: string): Promise<string> {
  const absolute = resolve(path);
  let current = absolute;
  while (true) {
    requireArchive(!(await lstat(current)).isSymbolicLink());
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  requireArchive(resolve(await realpath(absolute)) === absolute);
  return absolute;
}

/** Reads a regular file with a fixed allocation, detecting size changes. */
export async function readBounded(path: string, maxBytes: number): Promise<Buffer> {
  requireArchive(integer(maxBytes, LIMITS.compressedBytes) && maxBytes > 0, 'LIMIT_EXCEEDED');
  await checkedPath(path);
  const handle = await open(path, 'r');
  try {
    const before = await handle.stat();
    requireArchive(before.isFile());
    requireArchive(before.size <= maxBytes, 'LIMIT_EXCEEDED');
    const bytes = Buffer.alloc(before.size + 1);
    let count = 0;
    while (count < bytes.length) {
      const result = await handle.read(bytes, count, bytes.length - count, null);
      if (result.bytesRead === 0) {
        break;
      }
      count += result.bytesRead;
    }
    const after = await handle.stat();
    requireArchive(count === before.size && after.size === before.size && after.mtimeMs === before.mtimeMs);
    await checkedPath(path);
    return bytes.subarray(0, count);
  } finally {
    await handle.close();
  }
}

function validateManifest(value: unknown): Manifest {
  requireArchive(object(value) && value.format === 'tm-history-archive');
  requireArchive(value.version === 1 && value.codec === 'structural-json-v1' && value.compression === 'gzip' &&
    value.canonicalEncoding === 'tm-json-v1', 'UNSUPPORTED_ARCHIVE_VERSION');
  requireArchive(integer(value.count, LIMITS.records) && value.count > 0);
  requireArchive(object(value.source) && (value.source.kind === 'files' || value.source.kind === 'sqlite'));
  for (const field of ['schema', 'engineRevision']) {
    requireArchive(typeof value.source[field] === 'string' && value.source[field].length > 0 && value.source[field].length <= 256);
  }
  requireArchive(Object.keys(value.source).sort().join(',') === 'engineRevision,kind,schema');
  requireArchive(Array.isArray(value.groups) && value.groups.length > 0 && value.groups.length <= value.count);
  const entries: Array<StateIndex> = [];
  let decoded = 0;
  let compressed = 0;
  for (const [ordinal, group] of value.groups.entries()) {
    requireArchive(object(group) && group.ordinal === ordinal && integer(group.count, LIMITS.groupRecords) && group.count > 0);
    requireArchive(integer(group.decodedBytes, LIMITS.groupBytes) && group.decodedBytes > 0);
    requireArchive(integer(group.compressedBytes, LIMITS.compressedBytes) && group.compressedBytes > 0 && isHash(group.compressedHash));
    decoded += group.decodedBytes;
    compressed += group.compressedBytes;
    requireArchive(decoded <= LIMITS.totalBytes && compressed <= LIMITS.compressedBytes, 'LIMIT_EXCEEDED');
    requireArchive(Array.isArray(group.entries) && group.entries.length === group.count);
    for (const entry of group.entries) {
      requireArchive(object(entry) && integer(entry.saveId) && isHash(entry.stateHash));
      requireArchive(Object.keys(entry).sort().join(',') === 'saveId,stateHash');
      entries.push({saveId: entry.saveId, stateHash: entry.stateHash});
    }
    requireArchive(group.firstSaveId === group.entries[0].saveId && group.lastSaveId === group.entries[group.count - 1].saveId);
  }
  requireArchive(entries.length === value.count);
  requireArchive(canonical(value.coverage, LIMITS.manifestBytes) === canonical(coverageOf(entries), LIMITS.manifestBytes));
  const manifest = value as Manifest;
  requireArchive(manifest.sourceDigest === sourceDigest(manifest.source, entries));
  return manifest;
}

function sanitized(error: unknown): ArchiveError {
  return error instanceof ArchiveError ? error : new ArchiveError('ARCHIVE_CORRUPT');
}

export async function readManifest(root: string): Promise<Manifest> {
  try {
    return validateManifest(parseJson(await readBounded(join(root, 'manifest.json'), LIMITS.manifestBytes), LIMITS.manifestBytes));
  } catch (error) {
    throw sanitized(error);
  }
}

async function* readGroup(root: string, group: GroupDescriptor): AsyncGenerator<SavedState> {
  const compressed = await readBounded(join(root, groupFilename(group.ordinal)), group.compressedBytes);
  requireArchive(compressed.length === group.compressedBytes && digest(compressed) === group.compressedHash);
  let bytes: Buffer;
  try {
    bytes = gunzipSync(compressed, {maxOutputLength: group.decodedBytes});
  } catch {
    throw new ArchiveError('ARCHIVE_CORRUPT');
  }
  requireArchive(bytes.length === group.decodedBytes);
  const records = parseJson(bytes, LIMITS.groupBytes);
  requireArchive(Array.isArray(records) && records.length === group.count && records[0]?.kind === 'full');
  let previous: SavedState | undefined;
  for (const [index, record] of records.entries()) {
    requireArchive(object(record) && record.saveId === group.entries[index].saveId && record.stateHash === group.entries[index].stateHash);
    const state = restoreRecord(record, previous);
    previous = {saveId: group.entries[index].saveId, state};
    yield previous;
  }
}

/** Returns private inert JSON; this API must never be exposed directly over HTTP. */
export async function readSave(root: string, saveId: number): Promise<Json> {
  try {
    const manifest = await readManifest(root);
    requireArchive(integer(saveId), 'SAVE_NOT_RECORDED');
    const group = manifest.groups.find((candidate) => candidate.entries.some((entry) => entry.saveId === saveId));
    requireArchive(group, 'SAVE_NOT_RECORDED');
    for await (const saved of readGroup(root, group)) {
      if (saved.saveId === saveId) {
        if (saveId === manifest.coverage.lastSaveId) {
          requireArchive(object(saved.state) && saved.state.phase === 'end');
        }
        return saved.state;
      }
    }
    throw new ArchiveError('SAVE_NOT_RECORDED');
  } catch (error) {
    throw sanitized(error);
  }
}

/** Streams verified private states without retaining the complete history. */
export async function* readArchive(root: string): AsyncGenerator<SavedState> {
  try {
    const manifest = await readManifest(root);
    let count = 0;
    for (const group of manifest.groups) {
      for await (const saved of readGroup(root, group)) {
        count++;
        if (count === manifest.count) {
          requireArchive(object(saved.state) && saved.state.phase === 'end');
        }
        yield saved;
      }
    }
    requireArchive(count === manifest.count);
  } catch (error) {
    throw sanitized(error);
  }
}

/** Reconstructs every recorded state without retaining the complete history. */
export async function verifyArchive(root: string): Promise<number> {
  let count = 0;
  for await (const _saved of readArchive(root)) {
    count++;
  }
  return count;
}
