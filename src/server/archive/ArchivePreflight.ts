import fs from 'node:fs/promises';
import {dirname} from 'node:path';
import {ArchiveError, integer, LIMITS, requireArchive, sourceDigest} from '@/server/archive/ArchiveFormat';
import {offlinePath, overlaps} from '@/server/archive/ArchiveFilesystem';
import {HistorySnapshot, HistorySource} from '@/server/archive/HistorySource';

export type ArchiveSource = Pick<HistorySource, 'path' | 'metadata' | 'workspace' | 'scan'>;
export type CapacitySummary = {databaseBytes: number;
  stagingBytes: number; archiveBudgetBytes: number; reserveBytes: number;
  requiredFreeBytes: number; availableBytes: number};
export type PreflightSummary = CapacitySummary & {status: 'READY'; sourceRevision: string; count: number;
  rawSourceBytes: number; canonicalStateBytes: number};

/** Admits both archive storage and the SQLite journal filesystem with a fixed reserve. */
export async function checkCapacity(root: string, databasePath?: string): Promise<CapacitySummary> {
  try {
    const databaseBytes = databasePath === undefined ? 0 : (await fs.stat(databasePath)).size;
    const capacity = await fs.statfs(root, {bigint: true});
    let availableBytes = Number(capacity.bavail * capacity.bsize);
    if (databasePath !== undefined) {
      const sourceCapacity = await fs.statfs(dirname(databasePath), {bigint: true});
      availableBytes = Math.min(availableBytes, Number(sourceCapacity.bavail * sourceCapacity.bsize));
    }
    const stagingBytes = 2 * LIMITS.totalBytes;
    const archiveBudgetBytes = 2 * LIMITS.compressedBytes;
    const reserveBytes = 2 * 1024 * 1024 * 1024;
    const requiredFreeBytes = databaseBytes + stagingBytes + archiveBudgetBytes + reserveBytes;
    requireArchive(integer(databaseBytes) && integer(availableBytes) && integer(requiredFreeBytes), 'LIMIT_EXCEEDED');
    requireArchive(availableBytes >= requiredFreeBytes, 'INSUFFICIENT_SPACE');
    return {databaseBytes, stagingBytes, archiveBudgetBytes, reserveBytes, requiredFreeBytes, availableBytes};
  } catch (error) {
    throw error instanceof ArchiveError ? error : new ArchiveError('IO_FAILURE');
  }
}

/** Validates one offline source and capacity without writing an archive or claiming prune readiness. */
export async function preflight(source: ArchiveSource, outputRoot: string): Promise<{
  root: string; snapshot: HistorySnapshot; summary: PreflightSummary;
}> {
  try {
    let root: string;
    try {
      root = await offlinePath(outputRoot, source.workspace);
      requireArchive((await fs.stat(root)).isDirectory(), 'SOURCE_UNSUPPORTED');
    } catch {
      throw new ArchiveError('SOURCE_UNSUPPORTED');
    }
    requireArchive(!overlaps(source.path, root), 'SOURCE_UNSUPPORTED');
    const snapshot = await source.scan();
    const capacity = await checkCapacity(root, source.metadata.kind === 'sqlite' ? source.path : undefined);
    return {root, snapshot, summary: {status: 'READY',
      sourceRevision: sourceDigest(source.metadata, snapshot.entries), count: snapshot.entries.length,
      rawSourceBytes: snapshot.rawBytes, canonicalStateBytes: snapshot.canonicalBytes, ...capacity}};
  } catch (error) {
    throw error instanceof ArchiveError ? error : new ArchiveError('IO_FAILURE');
  }
}
