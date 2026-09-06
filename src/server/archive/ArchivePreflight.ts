import fs from 'node:fs/promises';
import {ArchiveError, integer, LIMITS, requireArchive, sourceDigest} from '@/server/archive/ArchiveFormat';
import {offlinePath, overlaps} from '@/server/archive/ArchiveFilesystem';
import {HistorySnapshot, HistorySource} from '@/server/archive/HistorySource';

export type ArchiveSource = Pick<HistorySource, 'path' | 'metadata' | 'workspace' | 'scan'>;
export type PreflightSummary = {status: 'READY'; sourceRevision: string; count: number;
  rawSourceBytes: number; canonicalStateBytes: number; databaseBytes: number;
  stagingBytes: number; archiveBudgetBytes: number; reserveBytes: number;
  requiredFreeBytes: number; availableBytes: number};

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
    const databaseBytes = source.metadata.kind === 'sqlite' ? (await fs.stat(source.path)).size : 0;
    const capacity = await fs.statfs(root, {bigint: true});
    const availableBytes = Number(capacity.bavail * capacity.bsize);
    const stagingBytes = 2 * LIMITS.totalBytes;
    const archiveBudgetBytes = 2 * LIMITS.compressedBytes;
    const reserveBytes = 2 * 1024 * 1024 * 1024;
    const requiredFreeBytes = databaseBytes + stagingBytes + archiveBudgetBytes + reserveBytes;
    requireArchive(integer(databaseBytes) && integer(availableBytes) && integer(requiredFreeBytes), 'LIMIT_EXCEEDED');
    requireArchive(availableBytes >= requiredFreeBytes, 'INSUFFICIENT_SPACE');
    return {root, snapshot, summary: {status: 'READY',
      sourceRevision: sourceDigest(source.metadata, snapshot.entries), count: snapshot.entries.length,
      rawSourceBytes: snapshot.rawBytes, canonicalStateBytes: snapshot.canonicalBytes, databaseBytes,
      stagingBytes, archiveBudgetBytes, reserveBytes, requiredFreeBytes, availableBytes}};
  } catch (error) {
    throw error instanceof ArchiveError ? error : new ArchiveError('IO_FAILURE');
  }
}
