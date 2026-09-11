import type Database from 'better-sqlite3';
import {join} from 'node:path';
import {canonical, digest, integer, isHash, Json, LIMITS, Manifest, object, requireArchive} from '@/server/archive/ArchiveFormat';
import {readArchive, readManifest, readSave} from '@/server/archive/ArchiveReader';
import {offlinePath} from '@/server/archive/ArchiveFilesystem';
import {SavedState} from '@/server/archive/ArchiveCodec';

export type ArchiveBinding = Readonly<{gameId: string; archiveName: string; sourceRevision: string; coverage: string; version: 1}>;

/** Binds one current history revision to private immutable files on an explicit SQLite connection. */
export class ArchiveCatalog {
  private readonly prepared = new WeakSet<ArchiveBinding>();

  constructor(private readonly db: Database.Database, private readonly root: string, private readonly workspace?: string) {}

  initialize(): void {
    this.db.exec(`CREATE TABLE IF NOT EXISTS history_archives (
      game_id TEXT PRIMARY KEY, archive_name TEXT NOT NULL, source_revision TEXT NOT NULL,
      coverage TEXT NOT NULL, version INTEGER NOT NULL)`);
  }

  async prepare(gameId: string, archiveName: string): Promise<ArchiveBinding> {
    requireArchive(/^[a-zA-Z0-9_-]{1,64}$/.test(gameId), 'SOURCE_UNSUPPORTED');
    const {manifest} = await this.loadManifest(archiveName);
    const binding: ArchiveBinding = Object.freeze({gameId, archiveName, sourceRevision: manifest.sourceDigest,
      coverage: canonical(manifest.coverage), version: 1});
    let count = 0;
    for await (const _saved of this.archivedStates(binding)) {
      count++;
    }
    requireArchive(count === manifest.count);
    this.prepared.add(binding);
    return binding;
  }

  /** The caller must recheck the source and prune inside this same synchronous transaction. */
  attach(binding: ArchiveBinding): void {
    requireArchive(this.db.inTransaction && this.prepared.has(binding), 'ARCHIVE_CONFLICT');
    this.db.prepare('INSERT INTO history_archives VALUES (?, ?, ?, ?, ?)')
      .run(binding.gameId, binding.archiveName, binding.sourceRevision, binding.coverage, binding.version);
  }

  getBinding(gameId: string): ArchiveBinding | undefined {
    const row = this.db.prepare(`SELECT game_id AS gameId, archive_name AS archiveName,
      source_revision AS sourceRevision, coverage, version FROM history_archives WHERE game_id = ?`).get(gameId);
    if (row === undefined) {
      return undefined;
    }
    requireArchive(object(row));
    requireArchive(row.version === 1, 'UNSUPPORTED_ARCHIVE_VERSION');
    requireArchive(row.gameId === gameId && typeof row.archiveName === 'string' && /^archive-[a-f0-9]{64}$/.test(row.archiveName));
    requireArchive(isHash(row.sourceRevision) && typeof row.coverage === 'string' && Buffer.byteLength(row.coverage) <= LIMITS.manifestBytes);
    return Object.freeze({gameId, archiveName: row.archiveName, sourceRevision: row.sourceRevision, coverage: row.coverage, version: 1});
  }

  assertCurrent(binding: ArchiveBinding): void {
    const current = this.getBinding(binding.gameId);
    requireArchive(current !== undefined && canonical(current) === canonical(binding), 'SOURCE_CHANGED');
  }

  /** Detaches only the expected binding; the caller owns hydration and mutation in the transaction. */
  detach(binding: ArchiveBinding): void {
    requireArchive(this.db.inTransaction, 'ARCHIVE_CONFLICT');
    this.assertCurrent(binding);
    this.db.prepare('DELETE FROM history_archives WHERE game_id = ?').run(binding.gameId);
  }

  private async loadManifest(archiveName: string): Promise<{path: string; manifest: Manifest}> {
    requireArchive(/^archive-[a-f0-9]{64}$/.test(archiveName));
    const path = join(await offlinePath(this.root, this.workspace), archiveName);
    const manifest = await readManifest(path);
    requireArchive(manifest.source.kind === 'sqlite');
    requireArchive('archive-' + digest(canonical(manifest, LIMITS.manifestBytes)) === archiveName);
    return {path, manifest};
  }

  private async boundManifest(binding: ArchiveBinding): Promise<{path: string; manifest: Manifest}> {
    const loaded = await this.loadManifest(binding.archiveName);
    requireArchive(loaded.manifest.sourceDigest === binding.sourceRevision && canonical(loaded.manifest.coverage) === binding.coverage);
    return loaded;
  }

  /** Verifies every game's identity and the total reconstructed-byte bound before hydration. */
  async *archivedStates(binding: ArchiveBinding): AsyncGenerator<SavedState> {
    const {path} = await this.boundManifest(binding);
    let bytes = 0;
    for await (const saved of readArchive(path)) {
      requireArchive(object(saved.state) && saved.state.id === binding.gameId && saved.state.lastSaveId === saved.saveId);
      bytes += Buffer.byteLength(canonical(saved.state));
      requireArchive(bytes <= LIMITS.totalBytes, 'LIMIT_EXCEEDED');
      yield saved;
    }
  }

  private liveIds(gameId: string): Array<number> {
    const rows = this.db.prepare('SELECT save_id AS saveId FROM games WHERE game_id = ? ORDER BY save_id').all(gameId) as Array<{saveId: number}>;
    return rows.map((row) => row.saveId);
  }

  async getSaveIds(gameId: string): Promise<Array<number>> {
    const binding = this.getBinding(gameId);
    if (binding === undefined) {
      return this.liveIds(gameId);
    }
    const {manifest} = await this.boundManifest(binding);
    this.assertCurrent(binding);
    const ids = new Set(this.liveIds(gameId));
    for (const group of manifest.groups) {
      for (const entry of group.entries) {
        ids.add(entry.saveId);
      }
    }
    requireArchive(ids.size <= LIMITS.records, 'LIMIT_EXCEEDED');
    return Array.from(ids).sort((a, b) => a - b);
  }

  private liveVersion(gameId: string, saveId: number): Json | undefined {
    const row = this.db.prepare('SELECT game FROM games WHERE game_id = ? AND save_id = ?').get(gameId, saveId) as {game: string} | undefined;
    return row === undefined ? undefined : JSON.parse(row.game);
  }

  async getGameVersion(gameId: string, saveId: number): Promise<Json> {
    requireArchive(integer(saveId), 'SAVE_NOT_RECORDED');
    const live = this.liveVersion(gameId, saveId);
    if (live !== undefined) {
      return live;
    }
    const binding = this.getBinding(gameId);
    requireArchive(binding !== undefined, 'SAVE_NOT_RECORDED');
    const {path} = await this.boundManifest(binding);
    const state = await readSave(path, saveId);
    requireArchive(object(state) && state.id === gameId && state.lastSaveId === saveId);
    const updated = this.liveVersion(gameId, saveId);
    if (updated !== undefined) {
      return updated;
    }
    this.assertCurrent(binding);
    return state;
  }
}
