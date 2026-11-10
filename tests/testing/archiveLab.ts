import {tmpdir} from 'node:os';
import {join} from 'node:path';

/**
 * Root directory for archive / SQLite test fixtures.
 *
 * The archive admission policy (src/server/archive/ArchiveFilesystem.ts) refuses
 * any database whose ancestor directories contain a \`.git\` entry, so the lab must
 * live outside every repository. On Windows that policy also only admits \`D:\` sources.
 *
 * Override the location with the TM_ARCHIVE_LAB environment variable.
 */
export function archiveLab(scope: string): string {
  const root = process.env.TM_ARCHIVE_LAB ??
    (process.platform === 'win32' ? 'D:/tm-archive-lab' : tmpdir());
  return join(root, scope);
}
