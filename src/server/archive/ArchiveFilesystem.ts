import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {promisify} from 'node:util';
import {object, requireArchive} from '@/server/archive/ArchiveFormat';
import {checkedPath} from '@/server/archive/ArchiveReader';

const execute = promisify(execFile);

export async function exists(path: string): Promise<boolean> {
  try {
    await fs.lstat(path); return true;
  } catch (error) {
    if (object(error) && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/** Restricts offline paths to D: on Windows or an explicit private Linux workspace. */
export async function offlinePath(path: string, workspace?: string): Promise<string> {
  requireArchive(process.platform === 'win32' || process.platform === 'linux', 'SOURCE_UNSUPPORTED');
  requireArchive(isAbsolute(path), 'SOURCE_UNSUPPORTED');
  if (process.platform === 'win32') {
    requireArchive(/^[dD]:[\\/]/.test(path), 'SOURCE_UNSUPPORTED');
  } else {
    requireArchive(workspace !== undefined, 'SOURCE_UNSUPPORTED');
  }
  const absolute = await checkedPath(path);
  requireArchive(!/[\\/](prod|production|staging|preview|current|assets|public|static|build)([\\/]|$)/i.test(absolute), 'SOURCE_UNSUPPORTED');
  requireArchive(absolute.toLowerCase() !== resolve('D:/tm-db/game.db').toLowerCase(), 'SOURCE_UNSUPPORTED');
  if (workspace !== undefined) {
    requireArchive(isAbsolute(workspace), 'SOURCE_UNSUPPORTED');
    const root = await checkedPath(workspace);
    const stat = await fs.stat(root);
    requireArchive(stat.isDirectory(), 'SOURCE_UNSUPPORTED');
    const suffix = relative(root, absolute);
    requireArchive(!isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith('..' + sep), 'SOURCE_UNSUPPORTED');
    if (process.platform === 'linux') {
      requireArchive(stat.uid === process.getuid?.() && (stat.mode & 0o077) === 0, 'SOURCE_UNSUPPORTED');
    }
  }
  let parent = absolute;
  while (dirname(parent) !== parent) {
    requireArchive(!await exists(resolve(parent, '.git')), 'SOURCE_UNSUPPORTED');
    parent = dirname(parent);
  }
  return absolute;
}

export function overlaps(left: string, right: string): boolean {
  const normalize = (value: string) => process.platform === 'win32' ? resolve(value).toLowerCase() : resolve(value);
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.startsWith(b + sep) || b.startsWith(a + sep);
}

/** Establishes private permissions before any state bytes are written. */
export async function privateDirectory(root: string): Promise<string> {
  const directory = await fs.mkdtemp(join(root, '.pending-'));
  if (process.platform === 'win32') {
    const system = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32');
    const {stdout} = await execute(join(system, 'whoami.exe'), ['/user', '/fo', 'csv', '/nh']);
    const sid = stdout.match(/S-1-[0-9-]+/)?.[0];
    requireArchive(sid, 'IO_FAILURE');
    await execute(join(system, 'icacls.exe'), [directory, '/inheritance:r', '/grant:r',
      `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F', '/Q']);
  } else {
    requireArchive(process.platform === 'linux', 'SOURCE_UNSUPPORTED');
    const stat = await fs.stat(directory);
    requireArchive(stat.uid === process.getuid?.() && (stat.mode & 0o777) === 0o700, 'IO_FAILURE');
  }
  await checkedPath(directory);
  return directory;
}

/** Persists a Linux directory update; Windows publication retains its ACL/file-sync contract. */
export async function syncDirectory(path: string): Promise<void> {
  if (process.platform !== 'linux') {
    return;
  }
  const handle = await fs.open(await checkedPath(path), 'r');
  try {
    requireArchive((await handle.stat()).isDirectory());
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Syncs a previously verified Linux archive before returning an idempotent receipt. */
export async function syncExistingFiles(root: string, names: ReadonlyArray<string>): Promise<void> {
  if (process.platform !== 'linux') {
    return;
  }
  for (const name of names) {
    const handle = await fs.open(await checkedPath(join(root, name)), 'r');
    try {
      requireArchive((await handle.stat()).isFile());
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  await syncDirectory(root);
  await syncDirectory(dirname(root));
}
