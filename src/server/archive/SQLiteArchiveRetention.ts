import type Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import {isAbsolute, resolve} from 'node:path';
import {ArchiveBinding, ArchiveCatalog} from '@/server/archive/ArchiveCatalog';
import {SavedState} from '@/server/archive/ArchiveCodec';
import {ArchiveError, canonical, digest, integer, isHash, Json, LIMITS, object, parseJson, requireArchive, sourceDigest, StateIndex} from '@/server/archive/ArchiveFormat';
import {offlinePath, overlaps} from '@/server/archive/ArchiveFilesystem';
import {ArchiveSource, CapacitySummary, checkCapacity, preflight} from '@/server/archive/ArchivePreflight';
import {checkedPath} from '@/server/archive/ArchiveReader';
import {HistorySnapshot} from '@/server/archive/HistorySource';
import {exportHistory} from '@/server/archive/ArchiveWriter';

export type ArchiveLocation = {root: string; workspace?: string};
export type RetentionPlan = CapacitySummary & {status: 'READY' | 'ALREADY_ARCHIVED' | 'NOTHING_TO_PRUNE';
  sourceRevision: string; count: number; prunableRows: number; rawSourceBytes: number};
export type RetentionResult = {status: 'ARCHIVED' | 'ALREADY_ARCHIVED' | 'NOTHING_TO_PRUNE';
  sourceRevision: string; archiveName?: string; count: number; removedRows: number; retainedRows: number;
  freePagesBefore?: number; freePagesAfter?: number};
const metadata = Object.freeze({kind: 'sqlite', schema: 'unknown', engineRevision: 'unknown'} as const);
type Snapshot = HistorySnapshot & {saves: Array<SavedState>; revision: string};
type RowIndex = {saveId: number; bytes: number; players: number; status: string; createdTime: number};
let working = false;

/** Owns archive-before-prune and synchronous rehydration transactions for explicit SQLite storage. */
export class SQLiteArchiveRetention {
  readonly catalog: ArchiveCatalog;

  constructor(private readonly db: Database.Database, private readonly filename: string, private readonly location: ArchiveLocation) {
    this.catalog = new ArchiveCatalog(db, location.root, location.workspace);
  }

  private binding(gameId: string): ArchiveBinding | undefined {
    requireArchive(/^[a-zA-Z0-9_-]{1,64}$/.test(gameId), 'SOURCE_UNSUPPORTED');
    const exists = this.db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'history_archives'").get();
    return exists === undefined ? undefined : this.catalog.getBinding(gameId);
  }

  private snapshot(gameId: string, completed: boolean, collect: boolean = false): Snapshot {
    const read = () => {
      const rows = this.db.prepare(`SELECT save_id AS saveId, length(CAST(game AS BLOB)) AS bytes,
        players, status, created_time AS createdTime FROM games WHERE game_id = ? ORDER BY save_id LIMIT ?`)
        .all(gameId, LIMITS.records + 1) as Array<RowIndex>;
      requireArchive(rows.length > 0, 'SOURCE_HISTORY_EMPTY');
      requireArchive(rows.length <= LIMITS.records, 'LIMIT_EXCEEDED');
      let rawBytes = 0;
      for (const row of rows) {
        requireArchive(integer(row.bytes, LIMITS.stateBytes) && row.bytes > 0, 'LIMIT_EXCEEDED');
        rawBytes += row.bytes;
      }
      requireArchive(rawBytes <= LIMITS.totalBytes, 'LIMIT_EXCEEDED');
      const entries: Array<StateIndex> = [];
      const rawHashes: Array<string> = [];
      const saves: Array<SavedState> = [];
      let canonicalBytes = 0;
      let ended = false;
      for (const row of rows) {
        requireArchive(integer(row.saveId) && (entries.length === 0 || row.saveId > entries[entries.length - 1].saveId), 'SOURCE_UNSUPPORTED');
        const value = this.db.prepare('SELECT game FROM games WHERE game_id = ? AND save_id = ?').get(gameId, row.saveId) as {game: unknown};
        requireArchive(typeof value.game === 'string', 'SOURCE_UNSUPPORTED');
        const bytes = Buffer.from(value.game);
        requireArchive(bytes.length === row.bytes, 'SOURCE_CHANGED');
        const state = parseJson(bytes, LIMITS.stateBytes);
        requireArchive(object(state) && state.id === gameId && state.lastSaveId === row.saveId, 'SOURCE_UNSUPPORTED');
        const encoded = canonical(state);
        canonicalBytes += Buffer.byteLength(encoded);
        requireArchive(canonicalBytes <= LIMITS.totalBytes, 'LIMIT_EXCEEDED');
        entries.push({saveId: row.saveId, stateHash: digest(encoded)});
        rawHashes.push(digest(bytes));
        ended = state.phase === 'end';
        if (collect) {
          saves.push({saveId: row.saveId, state: state as Json});
        }
      }
      const completion = this.db.prepare('SELECT completed_time AS time FROM completed_game WHERE game_id = ?').get(gameId);
      if (completed) {
        requireArchive(ended && completion !== undefined && rows.every((row) => row.status === 'finished'), 'SOURCE_NOT_COMPLETED');
      }
      const fingerprint = digest(canonical({rows, rawHashes, completion: completion ?? 'none'}, LIMITS.manifestBytes));
      return {entries, rawBytes, canonicalBytes, fingerprint, saves, revision: sourceDigest(metadata, entries)};
    };
    return this.db.inTransaction ? read() : this.db.transaction(read)();
  }

  private source(gameId: string): ArchiveSource {
    return {path: this.filename, metadata, workspace: this.location.workspace, scan: async (consume) => {
      const snapshot = this.snapshot(gameId, true, consume !== undefined);
      if (consume) {
        for (const saved of snapshot.saves) {
          await consume(saved);
        }
      }
      return snapshot;
    }};
  }

  private async root(): Promise<string> {
    requireArchive(isAbsolute(this.filename), 'SOURCE_UNSUPPORTED');
    requireArchive(resolve(this.db.name) === resolve(this.filename), 'SOURCE_UNSUPPORTED');
    const file = await checkedPath(this.filename);
    requireArchive((await fs.stat(file)).isFile(), 'SOURCE_UNSUPPORTED');
    const root = await offlinePath(this.location.root, this.location.workspace);
    requireArchive(!overlaps(file, root), 'SOURCE_UNSUPPORTED');
    const journal = this.db.prepare('PRAGMA journal_mode').get() as {journal_mode: string};
    const sync = this.db.prepare('PRAGMA synchronous').get() as {synchronous: number};
    requireArchive(journal.journal_mode === 'delete' && sync.synchronous >= 2, 'SOURCE_UNSUPPORTED');
    return root;
  }

  private async operation<T>(work: () => Promise<T>): Promise<T> {
    requireArchive(!working && !this.db.inTransaction, 'ARCHIVE_CONFLICT');
    working = true;
    try {
      this.db.pragma('busy_timeout = 5000');
      return await work();
    } catch (error) {
      if (error instanceof ArchiveError) {
        throw error;
      }
      throw new ArchiveError(object(error) && (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') ? 'ARCHIVE_CONFLICT' : 'IO_FAILURE');
    } finally {
      working = false;
    }
  }

  private async existing(gameId: string, binding: ArchiveBinding): Promise<{snapshot: Snapshot; count: number}> {
    const snapshot = this.snapshot(gameId, true);
    const live = new Map(snapshot.entries.map((entry) => [entry.saveId, entry.stateHash]));
    let count = 0;
    for await (const saved of this.catalog.archivedStates(binding)) {
      count++;
      const hash = live.get(saved.saveId);
      if (hash !== undefined) {
        requireArchive(hash === digest(canonical(saved.state)), 'SOURCE_CHANGED');
        live.delete(saved.saveId);
      }
    }
    requireArchive(live.size === 0 && this.snapshot(gameId, true).fingerprint === snapshot.fingerprint, 'SOURCE_CHANGED');
    this.catalog.assertCurrent(binding);
    return {snapshot, count};
  }

  preview(gameId: string): Promise<RetentionPlan> {
    return this.operation(async () => {
      const root = await this.root();
      const binding = this.binding(gameId);
      if (binding !== undefined) {
        const capacity = await checkCapacity(root, this.filename);
        const {snapshot, count} = await this.existing(gameId, binding);
        return {...capacity, status: 'ALREADY_ARCHIVED', sourceRevision: binding.sourceRevision,
          count, prunableRows: 0, rawSourceBytes: snapshot.rawBytes};
      }
      const {summary, snapshot} = await preflight(this.source(gameId), root);
      const last = snapshot.entries[snapshot.entries.length - 1].saveId;
      const prunableRows = snapshot.entries.filter((entry) => entry.saveId > 0 && entry.saveId < last).length;
      return {...summary, status: prunableRows === 0 ? 'NOTHING_TO_PRUNE' : 'READY', prunableRows};
    });
  }

  apply(gameId: string, expectedRevision: string, exclusive: boolean): Promise<RetentionResult> {
    return this.operation(async () => {
      requireArchive(exclusive === true && isHash(expectedRevision), 'SOURCE_UNSUPPORTED');
      const root = await this.root();
      await checkCapacity(root, this.filename);
      const binding = this.binding(gameId);
      if (binding !== undefined) {
        requireArchive(binding.sourceRevision === expectedRevision, 'SOURCE_CHANGED');
        const {snapshot, count} = await this.existing(gameId, binding);
        return {status: 'ALREADY_ARCHIVED', sourceRevision: expectedRevision, archiveName: binding.archiveName,
          count, removedRows: 0, retainedRows: snapshot.entries.length};
      }
      const before = this.snapshot(gameId, true);
      requireArchive(before.revision === expectedRevision, 'SOURCE_CHANGED');
      const last = before.entries[before.entries.length - 1].saveId;
      const prunable = before.entries.filter((entry) => entry.saveId > 0 && entry.saveId < last);
      if (prunable.length === 0) {
        return {status: 'NOTHING_TO_PRUNE', sourceRevision: expectedRevision,
          count: before.entries.length, removedRows: 0, retainedRows: before.entries.length};
      }
      const receipt = await exportHistory(this.source(gameId), root);
      const prepared = await this.catalog.prepare(gameId, receipt.revision);
      requireArchive(prepared.sourceRevision === expectedRevision, 'SOURCE_CHANGED');
      await checkCapacity(root, this.filename);
      return this.db.transaction((): RetentionResult => {
        requireArchive(this.binding(gameId) === undefined, 'SOURCE_CHANGED');
        const current = this.snapshot(gameId, true);
        requireArchive(current.fingerprint === before.fingerprint && current.revision === expectedRevision, 'SOURCE_CHANGED');
        const freePagesBefore = (this.db.prepare('PRAGMA freelist_count').get() as {freelist_count: number}).freelist_count;
        this.catalog.initialize();
        this.catalog.attach(prepared);
        const remove = this.db.prepare('DELETE FROM games WHERE game_id = ? AND save_id = ?');
        let removedRows = 0;
        for (const entry of prunable) {
          removedRows += remove.run(gameId, entry.saveId).changes;
        }
        requireArchive(removedRows === prunable.length, 'SOURCE_CHANGED');
        const freePagesAfter = (this.db.prepare('PRAGMA freelist_count').get() as {freelist_count: number}).freelist_count;
        return {status: 'ARCHIVED', sourceRevision: expectedRevision, archiveName: receipt.revision,
          count: before.entries.length, removedRows, retainedRows: before.entries.length - removedRows,
          freePagesBefore, freePagesAfter};
      }).immediate();
    });
  }

  /** Runs a synchronous SQLite mutation after atomically restoring the current logical history. */
  withHydratedHistory(gameId: string, mutate: () => undefined): Promise<void> {
    return this.operation(async () => {
      const binding = this.binding(gameId);
      if (binding === undefined) {
        this.db.transaction(mutate).immediate();
        return;
      }
      const root = await this.root();
      await checkCapacity(root, this.filename);
      const before = this.snapshot(gameId, false);
      const live = new Set(before.entries.map((entry) => entry.saveId));
      const missing: Array<{saveId: number; game: string}> = [];
      let bytes = before.canonicalBytes;
      for await (const saved of this.catalog.archivedStates(binding)) {
        if (live.has(saved.saveId)) {
          continue;
        }
        const game = canonical(saved.state);
        bytes += Buffer.byteLength(game);
        requireArchive(bytes <= LIMITS.totalBytes && live.size + missing.length < LIMITS.records, 'LIMIT_EXCEEDED');
        missing.push({saveId: saved.saveId, game});
      }
      await checkCapacity(root, this.filename);
      this.db.transaction(() => {
        this.catalog.assertCurrent(binding);
        requireArchive(this.snapshot(gameId, false).fingerprint === before.fingerprint, 'SOURCE_CHANGED');
        const insert = this.db.prepare(`INSERT INTO games (game_id, players, save_id, game, status, created_time)
          SELECT game_id, players, ?, ?, status, created_time FROM games WHERE game_id = ?
          ORDER BY save_id DESC LIMIT 1 ON CONFLICT (game_id, save_id) DO NOTHING`);
        for (const saved of missing) {
          requireArchive(insert.run(saved.saveId, saved.game, gameId).changes === 1, 'SOURCE_CHANGED');
        }
        this.catalog.detach(binding);
        mutate();
      }).immediate();
    });
  }
}
