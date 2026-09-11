import {open, opendir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import type Database from 'better-sqlite3';
import {SavedState} from '@/server/archive/ArchiveCodec';
import {ArchiveError, canonical, digest, integer, Json, LIMITS, object, parseJson,
  requireArchive, SourceMetadata, StateIndex} from '@/server/archive/ArchiveFormat';
import {checkedPath, readBounded} from '@/server/archive/ArchiveReader';
import {exists, offlinePath} from '@/server/archive/ArchiveFilesystem';

type Selection = {kind: 'files' | 'sqlite'; path: string; gameId: string; offline: true;
  schema?: string; engineRevision?: string; workspace?: string};
export type HistorySnapshot = {entries: Array<StateIndex>; fingerprint: string; rawBytes: number; canonicalBytes: number};
type Consume = (saved: SavedState) => Promise<void>;
type RawSave = {saveId: number; bytes: Buffer};

/** Reads one explicitly selected completed history without initializing game storage. */
export class HistorySource {
  public readonly metadata: SourceMetadata;
  public readonly path: string;
  public readonly workspace: string | undefined;
  private readonly gameId: string;
  constructor(selection: Selection) {
    requireArchive(selection.offline === true && (selection.kind === 'files' || selection.kind === 'sqlite'), 'SOURCE_UNSUPPORTED');
    requireArchive(/^[a-zA-Z0-9_-]{1,64}$/.test(selection.gameId), 'SOURCE_UNSUPPORTED');
    this.path = selection.path;
    this.workspace = selection.workspace;
    this.gameId = selection.gameId;
    this.metadata = Object.freeze({kind: selection.kind, schema: selection.schema ?? 'unknown', engineRevision: selection.engineRevision ?? 'unknown'});
    for (const value of [this.metadata.schema, this.metadata.engineRevision]) {
      requireArchive(typeof value === 'string' && value.length > 0 && value.length <= 256, 'SOURCE_UNSUPPORTED');
    }
  }

  public async scan(consume?: Consume): Promise<HistorySnapshot> {
    try {
      const root = await offlinePath(this.path, this.workspace);
      return this.metadata.kind === 'files' ? await this.scanFiles(root, consume) : await this.scanSQLite(root, consume);
    } catch (error) {
      if (error instanceof ArchiveError && error.code !== 'ARCHIVE_CORRUPT') {
        throw error;
      }
      throw new ArchiveError('SOURCE_UNSUPPORTED');
    }
  }

  private decode(raw: RawSave): Json {
    const state = parseJson(raw.bytes, LIMITS.stateBytes);
    canonical(state);
    requireArchive(object(state) && state.id === this.gameId && state.lastSaveId === raw.saveId, 'SOURCE_UNSUPPORTED');
    return state as Json;
  }

  private async collect(rows: AsyncIterable<RawSave>, current: RawSave | undefined, consume?: Consume): Promise<HistorySnapshot> {
    const entries: Array<StateIndex> = [];
    const rawHashes: Array<string> = [];
    let rawBytes = 0;
    let canonicalBytes = 0;
    let latest: Json | undefined;
    for await (const raw of rows) {
      requireArchive(entries.length < LIMITS.records, 'LIMIT_EXCEEDED');
      requireArchive(integer(raw.saveId) && (entries.length === 0 || raw.saveId > entries[entries.length - 1].saveId), 'SOURCE_UNSUPPORTED');
      rawBytes += raw.bytes.length;
      requireArchive(rawBytes <= LIMITS.totalBytes, 'LIMIT_EXCEEDED');
      latest = this.decode(raw);
      const encoded = canonical(latest);
      canonicalBytes += Buffer.byteLength(encoded);
      requireArchive(canonicalBytes <= LIMITS.totalBytes, 'LIMIT_EXCEEDED');
      entries.push({saveId: raw.saveId, stateHash: digest(encoded)});
      rawHashes.push(digest(raw.bytes));
      if (consume) {
        await consume({saveId: raw.saveId, state: latest});
      }
    }
    requireArchive(entries.length > 0, 'SOURCE_HISTORY_EMPTY');
    requireArchive(object(latest) && latest.phase === 'end', 'SOURCE_NOT_COMPLETED');
    if (current) {
      const state = this.decode(current);
      requireArchive(object(state) && state.phase === 'end', 'SOURCE_NOT_COMPLETED');
      requireArchive(current.saveId === entries[entries.length - 1].saveId && canonical(state) === canonical(latest), 'SOURCE_CHANGED');
    }
    return {entries, rawBytes, canonicalBytes, fingerprint: digest(canonical({entries, rawHashes, currentHash: current ? digest(current.bytes) : 'none'}, LIMITS.manifestBytes))};
  }

  private async scanFiles(root: string, consume?: Consume): Promise<HistorySnapshot> {
    const directory = await checkedPath(resolve(root, 'history'));
    const files: Array<{saveId: number; path: string}> = [];
    for await (const entry of await opendir(directory)) {
      if (!entry.name.startsWith(this.gameId + '-') || !entry.name.endsWith('.json')) {
        continue;
      }
      const digits = entry.name.slice(this.gameId.length + 1, -5);
      requireArchive(/^\d{1,16}$/.test(digits) && entry.isFile() && !entry.isSymbolicLink(), 'SOURCE_UNSUPPORTED');
      const saveId = Number(digits);
      requireArchive(integer(saveId), 'SOURCE_UNSUPPORTED');
      files.push({saveId, path: resolve(directory, entry.name)});
      requireArchive(files.length <= LIMITS.records, 'LIMIT_EXCEEDED');
    }
    requireArchive(files.length > 0, 'SOURCE_HISTORY_EMPTY');
    files.sort((a, b) => a.saveId - b.saveId);
    const currentBytes = await readBounded(resolve(root, this.gameId + '.json'), LIMITS.stateBytes);
    const currentValue = parseJson(currentBytes, LIMITS.stateBytes);
    requireArchive(object(currentValue) && integer(currentValue.lastSaveId), 'SOURCE_UNSUPPORTED');
    const current = {saveId: currentValue.lastSaveId, bytes: currentBytes};
    async function* rows() {
      for (const file of files) {
        yield {saveId: file.saveId, bytes: await readBounded(file.path, LIMITS.stateBytes)};
      }
    }
    return this.collect(rows(), current, consume);
  }

  private async scanSQLite(filename: string, consume?: Consume): Promise<HistorySnapshot> {
    // Refuse WAL/hot-journal inputs instead of creating sidecars or recovering a DB.
    for (const suffix of ['-wal', '-shm', '-journal']) {
      requireArchive(!await exists(filename + suffix), 'SOURCE_UNSUPPORTED');
    }
    const handle = await open(filename, 'r');
    try {
      const header = Buffer.alloc(100);
      const {bytesRead} = await handle.read(header, 0, 100, 0);
      requireArchive(bytesRead === 100 && header.toString('ascii', 0, 16) === 'SQLite format 3\0' && header[18] === 1 && header[19] === 1, 'SOURCE_UNSUPPORTED');
    } finally {
      await handle.close();
    }
    let db: Database.Database;
    try {
      // Optional native backend is loaded here so the file adapter remains usable without it.
      const SQLite = createRequire(__filename)('better-sqlite3') as typeof Database;
      db = new SQLite(filename, {readonly: true, fileMustExist: true});
    } catch {
      throw new ArchiveError('SOURCE_UNSUPPORTED');
    }
    try {
      db.pragma('query_only = ON');
      db.exec('BEGIN');
      const rows = db.prepare('SELECT rowid AS row, save_id AS saveId, length(CAST(game AS BLOB)) AS bytes FROM games WHERE game_id = ? ORDER BY save_id LIMIT ?')
        .all(this.gameId, LIMITS.records + 1) as Array<{row: number; saveId: number; bytes: number}>;
      requireArchive(rows.length <= LIMITS.records, 'LIMIT_EXCEEDED');
      const select = db.prepare('SELECT game FROM games WHERE rowid = ? AND game_id = ?');
      const gameId = this.gameId;
      async function* values() {
        for (const row of rows) {
          requireArchive(integer(row.bytes, LIMITS.stateBytes), 'LIMIT_EXCEEDED');
          const value = select.get(row.row, gameId) as {game: unknown} | undefined;
          requireArchive(value && typeof value.game === 'string', 'SOURCE_UNSUPPORTED');
          const bytes = Buffer.from(value.game);
          requireArchive(bytes.length === row.bytes, 'SOURCE_CHANGED');
          yield {saveId: row.saveId, bytes};
        }
      }
      return await this.collect(values(), undefined, consume);
    } finally {
      if (db.inTransaction) {
        db.exec('ROLLBACK');
      }
      db.close();
    }
  }
}
