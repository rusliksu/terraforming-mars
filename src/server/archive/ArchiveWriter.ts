import fs, {FileHandle} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {makeRecord, SavedState} from '@/server/archive/ArchiveCodec';
import {ArchiveError, canonical, Coverage, coverageOf, digest, GroupDescriptor, groupFilename, integer, LIMITS,
  Manifest, object, parseJson, requireArchive, sourceDigest, StateIndex} from '@/server/archive/ArchiveFormat';
import {checkedPath, readBounded, verifyArchive} from '@/server/archive/ArchiveReader';
import {exists, privateDirectory, syncDirectory, syncExistingFiles} from '@/server/archive/ArchiveFilesystem';
import {ArchiveSource, preflight} from '@/server/archive/ArchivePreflight';

export type ArchiveReceipt = {status: 'VERIFIED' | 'ALREADY_VERIFIED'; revision: string; count: number;
  format: Manifest['format']; codec: Manifest['codec']; coverage: Coverage; rawSourceBytes: number;
  groups: number; verifiedCount: number; canonicalStateBytes: number; compressedGroupBytes: number; manifestBytes: number};
let exporting = false;

function sanitized(error: unknown): ArchiveError {
  return error instanceof ArchiveError ? error : new ArchiveError('IO_FAILURE');
}

async function writeSynced(path: string, bytes: Buffer): Promise<void> {
  const file = await fs.open(path, 'wx', 0o600);
  try {
    await file.writeFile(bytes); await file.sync();
  } finally {
    await file.close();
  }
}

async function releaseLock(lock: FileHandle, path: string): Promise<void> {
  try {
    await lock.close(); await fs.unlink(path);
  } catch (error) {
    throw sanitized(error);
  }
}

/** Exports one completed offline history without deleting or replacing source data. */
export async function exportHistory(source: ArchiveSource, outputRoot: string): Promise<ArchiveReceipt> {
  requireArchive(!exporting, 'ARCHIVE_CONFLICT');
  exporting = true;
  let lock: Awaited<ReturnType<typeof fs.open>> | undefined;
  let lockPath: string | undefined;
  try {
    const {root, snapshot: before} = await preflight(source, outputRoot);
    lockPath = join(root, '.writer.lock');
    try {
      lock = await fs.open(lockPath, 'wx', 0o600);
    } catch (error) {
      if (object(error) && error.code === 'EEXIST') {
        throw new ArchiveError('ARCHIVE_CONFLICT');
      }
      throw error;
    }
    const temporary = await privateDirectory(root);
    const groups: Array<GroupDescriptor> = [];
    const records: Array<string> = [];
    const entries: Array<StateIndex> = [];
    let previous: SavedState | undefined;
    let groupBytes = 2;
    let decodedTotal = 0;
    let compressedTotal = 0;
    const flush = async () => {
      if (records.length === 0) {
        return;
      }
      const decoded = Buffer.from('[' + records.join(',') + ']');
      requireArchive(decoded.length === groupBytes && groupBytes <= LIMITS.groupBytes, 'LIMIT_EXCEEDED');
      decodedTotal += decoded.length;
      requireArchive(decodedTotal <= LIMITS.totalBytes, 'LIMIT_EXCEEDED');
      const compressed = gzipSync(decoded);
      compressedTotal += compressed.length;
      requireArchive(compressedTotal <= LIMITS.compressedBytes, 'LIMIT_EXCEEDED');
      const ordinal = groups.length;
      await writeSynced(join(temporary, groupFilename(ordinal)), compressed);
      groups.push({ordinal, firstSaveId: entries[0].saveId, lastSaveId: entries[entries.length - 1].saveId,
        count: entries.length, decodedBytes: decoded.length, compressedBytes: compressed.length,
        compressedHash: digest(compressed), entries: entries.slice()});
      records.length = 0;
      entries.length = 0;
      groupBytes = 2;
      previous = undefined;
    };
    const captured = await source.scan(async (saved) => {
      try {
        let record = makeRecord(saved.saveId, saved.state, previous);
        let text = canonical(record, LIMITS.groupBytes, 4);
        if (records.length === LIMITS.groupRecords || groupBytes + Buffer.byteLength(text) + (records.length ? 1 : 0) > LIMITS.groupBytes) {
          await flush();
          record = makeRecord(saved.saveId, saved.state);
          text = canonical(record, LIMITS.groupBytes, 4);
        }
        groupBytes += Buffer.byteLength(text) + (records.length ? 1 : 0);
        records.push(text);
        entries.push({saveId: saved.saveId, stateHash: record.stateHash});
        previous = saved;
      } catch (error) {
        throw sanitized(error);
      }
    });
    requireArchive(captured.fingerprint === before.fingerprint, 'SOURCE_CHANGED');
    await flush();
    const manifest: Manifest = {format: 'tm-history-archive', version: 1, codec: 'structural-json-v1',
      compression: 'gzip', canonicalEncoding: 'tm-json-v1', source: source.metadata,
      sourceDigest: sourceDigest(source.metadata, captured.entries), coverage: coverageOf(captured.entries),
      count: captured.entries.length, groups};
    const manifestBytes = Buffer.from(canonical(manifest, LIMITS.manifestBytes));
    const revision = 'archive-' + digest(manifestBytes);
    const receipt: ArchiveReceipt = {status: 'VERIFIED', revision, count: manifest.count, groups: groups.length,
      format: manifest.format, codec: manifest.codec, coverage: manifest.coverage, rawSourceBytes: captured.rawBytes,
      verifiedCount: manifest.count, canonicalStateBytes: captured.canonicalBytes, compressedGroupBytes: compressedTotal, manifestBytes: manifestBytes.length};
    const receiptBytes = Buffer.from(canonical(receipt));
    requireArchive(compressedTotal + manifestBytes.length + receiptBytes.length <= LIMITS.compressedBytes, 'LIMIT_EXCEEDED');
    await writeSynced(join(temporary, 'receipt.json'), receiptBytes);
    await writeSynced(join(temporary, 'manifest.json'), manifestBytes);
    requireArchive(await verifyArchive(temporary) === captured.entries.length);
    const after = await source.scan();
    requireArchive(after.fingerprint === before.fingerprint, 'SOURCE_CHANGED');
    await checkedPath(root);
    await syncDirectory(temporary);
    const destination = join(root, revision);
    if (await exists(destination)) {
      let originalReceipt: ArchiveReceipt;
      try {
        requireArchive((await readBounded(join(destination, 'manifest.json'), LIMITS.manifestBytes)).equals(manifestBytes));
        const storedBytes = await readBounded(join(destination, 'receipt.json'), LIMITS.manifestBytes);
        const stored = parseJson(storedBytes, LIMITS.manifestBytes);
        requireArchive(object(stored) && integer(stored.rawSourceBytes, LIMITS.totalBytes) && stored.rawSourceBytes > 0);
        // Source formatting can change without changing the canonical revision.
        originalReceipt = {...receipt, rawSourceBytes: stored.rawSourceBytes};
        requireArchive(storedBytes.equals(Buffer.from(canonical(originalReceipt))));
        requireArchive(await verifyArchive(destination) === captured.entries.length);
      } catch {
        throw new ArchiveError('ARCHIVE_CONFLICT');
      }
      await syncExistingFiles(destination, ['manifest.json', 'receipt.json', ...groups.map((group) => groupFilename(group.ordinal))]);
      // Only this successful attempt's exact files are removed, never stale output.
      await checkedPath(temporary);
      for (const name of ['manifest.json', 'receipt.json', ...groups.map((group) => groupFilename(group.ordinal))]) {
        await fs.unlink(join(temporary, name));
      }
      await fs.rmdir(temporary);
      return {...originalReceipt, status: 'ALREADY_VERIFIED'};
    }
    await fs.rename(temporary, destination);
    await syncDirectory(root);
    return receipt;
  } catch (error) {
    throw sanitized(error);
  } finally {
    try {
      if (lock && lockPath) {
        await releaseLock(lock, lockPath);
      }
    } finally {
      exporting = false;
    }
  }
}
