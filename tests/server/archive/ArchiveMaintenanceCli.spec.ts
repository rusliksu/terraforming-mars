import {expect} from 'chai';
import Database from 'better-sqlite3';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {promisify} from 'node:util';
import {ArchiveCatalog} from '@/server/archive/ArchiveCatalog';

const execute = promisify(execFile);
const supported = process.platform === 'win32' || (process.platform === 'linux' && process.env.CI === 'true');

(supported ? describe : describe.skip)('ArchiveMaintenanceCli', () => {
  let workspace: string;
  let filename: string;
  let output: string;
  const gameId = 'g000000000008';
  const states = [0, 2, 7, 9].map((lastSaveId) => ({id: gameId, lastSaveId,
    phase: lastSaveId === 9 ? 'end' : 'action', privateHand: ['never-print-' + lastSaveId]}));
  const args = () => ['--offline', '--database', filename, '--game', gameId,
    '--archives', output, '--workspace', workspace, '--max-states', '4'];
  async function run(argv: Array<string>, preload?: string) {
    try {
      const result = await execute(process.execPath, [...(preload ? ['--require', preload] : []),
        '--import=tsx', resolve('src/server/tools/maintain-game-history.ts'), ...argv],
      {timeout: 20000, maxBuffer: 65536});
      return {...result, code: 0};
    } catch (error) {
      return error as {stdout: string; stderr: string; code: number};
    }
  }
  async function preview() {
    const result = await run(args());
    expect(result.code, result.stderr).eq(0);
    return JSON.parse(result.stdout);
  }
  const applyArgs = (revision: string) => [...args(), '--apply', '--exclusive', '--revision', revision];
  function liveIds(db: Database.Database) {
    return db.prepare('SELECT save_id FROM games ORDER BY save_id').all();
  }
  async function checkHistory(expectedIds: Array<number>) {
    const db = new Database(filename);
    try {
      expect(liveIds(db)).deep.eq(expectedIds.map((save_id) => ({save_id})));
      const catalog = new ArchiveCatalog(db, output, workspace);
      for (const state of states) {
        expect(await catalog.getGameVersion(gameId, state.lastSaveId)).deep.eq(state);
      }
    } finally {
      db.close();
    }
  }
  beforeEach(async () => {
    const lab = process.platform === 'win32' ? 'D:/tm-db/smartbot-lab/maintenance-cli-tests' : tmpdir();
    await fs.mkdir(lab, {recursive: true});
    workspace = await fs.mkdtemp(join(lab, 'tm-maintenance-'));
    filename = join(workspace, 'copy.sqlite'); output = join(workspace, 'archives');
    await fs.mkdir(output);
    const db = new Database(filename);
    db.exec(`CREATE TABLE games (game_id TEXT, save_id INTEGER, game TEXT, players INTEGER,
      status TEXT, created_time INTEGER, PRIMARY KEY(game_id, save_id));
      CREATE TABLE completed_game (game_id TEXT PRIMARY KEY, completed_time INTEGER);`);
    for (const state of states) {
      db.prepare('INSERT INTO games VALUES (?, ?, ?, 2, ?, 0)').run(gameId, state.lastSaveId, JSON.stringify(state), 'finished');
    }
    db.prepare('INSERT INTO completed_game VALUES (?, 0)').run(gameId);
    db.close();
  });

  it('defaults to byte-preserving preview and applies only the selected finite history', async () => {
    const before = await fs.readFile(filename);
    const plan = await preview();
    expect(plan.status).eq('READY'); expect(plan.count).eq(4); expect(plan.prunableRows).eq(2);
    expect(plan.maxStates).eq(4); expect(plan.databaseBytes).eq(before.length);
    expect(plan.availableBytes).at.least(plan.requiredFreeBytes);
    expect(await fs.readFile(filename)).deep.eq(before);
    expect(await fs.readdir(output)).deep.eq([]);
    const result = await run(applyArgs(plan.sourceRevision));
    expect(result.code, result.stderr).eq(0);
    expect(JSON.parse(result.stdout).status).eq('ARCHIVED');
    expect(JSON.parse(result.stdout).removedRows).eq(2);
    expect(JSON.parse(result.stdout).databaseBytesBefore).eq(before.length);
    expect(JSON.parse(result.stdout).databaseBytesAfter).eq((await fs.stat(filename)).size);
    expect(result.stdout).not.include(gameId); expect(result.stdout).not.include('never-print');
    await checkHistory([0, 9]);
    const retry = await run(applyArgs(plan.sourceRevision));
    expect(retry.code, retry.stderr).eq(0); expect(JSON.parse(retry.stdout).removedRows).eq(0);
    expect(JSON.parse(retry.stdout).status).eq('ALREADY_ARCHIVED');
  }).timeout(30000);

  async function maintenanceLayout() {
    const runtime = join(workspace, 'prod', 'shared', 'db');
    await fs.mkdir(runtime, {recursive: true});
    const moved = join(runtime, 'game.db');
    await fs.rename(filename, moved);
    filename = moved;
    const archiveWorkspace = join(workspace, 'private-archive-workspace');
    await fs.mkdir(archiveWorkspace, {mode: 0o700});
    output = join(archiveWorkspace, 'archives');
    await fs.mkdir(output);
    workspace = archiveWorkspace;
    return ['--maintenance', ...args().slice(1)];
  }

  it('maintains an explicit runtime database with an independent private archive workspace', async () => {
    const argv = await maintenanceLayout();
    const before = await fs.readFile(filename);
    const offlineArgs = args(); offlineArgs[offlineArgs.indexOf('--workspace') + 1] = dirname(workspace);
    const offline = await run(offlineArgs);
    expect(offline.code).eq(1); expect(JSON.parse(offline.stderr).code).eq('SOURCE_UNSUPPORTED');
    const preview = await run(argv);
    expect(preview.code, preview.stderr).eq(0);
    const plan = JSON.parse(preview.stdout);
    expect(plan.status).eq('READY'); expect(plan.count).eq(4);
    expect(await fs.readFile(filename)).deep.eq(before);
    expect(await fs.readdir(output)).deep.eq([]);
    const refused = await run([...argv, '--apply', '--revision', plan.sourceRevision]);
    expect(refused.code).eq(2);
    const applied = await run([...argv, '--apply', '--exclusive', '--revision', plan.sourceRevision]);
    expect(applied.code, applied.stderr).eq(0); expect(JSON.parse(applied.stdout).removedRows).eq(2);
    expect(applied.stdout).not.include(gameId); expect(applied.stdout).not.include(filename);
    await checkHistory([0, 9]);
  }).timeout(30000);

  it('keeps maintenance source path and context validation before storage writes', async () => {
    const argv = await maintenanceLayout();
    const before = await fs.readFile(filename);
    const both = await run([...argv, '--offline']);
    expect(both.code).eq(2); expect(both.stdout).eq('');
    const link = join(workspace, 'linked-db');
    await fs.symlink(dirname(filename), link, 'junction');
    for (const input of ['relative.sqlite', dirname(filename), join(link, 'game.db')]) {
      const unsafe = argv.slice(); unsafe[unsafe.indexOf('--database') + 1] = input;
      const result = await run(unsafe);
      expect(result.code, result.stderr).eq(1); expect(result.stdout).eq('');
    }
    await fs.writeFile(join(dirname(filename), '.git'), 'gitdir: synthetic-checkout');
    const checkout = await run(argv);
    expect(checkout.code).eq(1); expect(JSON.parse(checkout.stderr).code).eq('SOURCE_UNSUPPORTED');
    expect(await fs.readFile(filename)).deep.eq(before);
    expect(await fs.readdir(output)).deep.eq([]);
  }).timeout(30000);

  (process.platform === 'linux' ? it : it.skip)('rejects a shared-writable source or non-private archive in maintenance context', async () => {
    const argv = await maintenanceLayout();
    const before = await fs.readFile(filename);
    await fs.chmod(filename, 0o666);
    const writableSource = await run(argv);
    expect(writableSource.code).eq(1); expect(JSON.parse(writableSource.stderr).code).eq('SOURCE_UNSUPPORTED');
    await fs.chmod(filename, 0o600);
    await fs.chmod(workspace, 0o755);
    const publicArchive = await run(argv);
    expect(publicArchive.code).eq(1); expect(JSON.parse(publicArchive.stderr).code).eq('SOURCE_UNSUPPORTED');
    expect(await fs.readFile(filename)).deep.eq(before);
    expect(await fs.readdir(output)).deep.eq([]);
  }).timeout(30000);

  it('rejects stale revisions and exceeded budgets without deleting or publishing', async () => {
    const plan = await preview();
    const limited = await run([...args().slice(0, -1), '3']);
    expect(limited.code).eq(1); expect(JSON.parse(limited.stderr).code).eq('LIMIT_EXCEEDED');
    const db = new Database(filename);
    db.prepare('UPDATE games SET game = ? WHERE save_id = 2').run(JSON.stringify({...states[1], privateHand: ['changed-private-value']}));
    db.close();
    const result = await run(applyArgs(plan.sourceRevision));
    expect(result.code).eq(1); expect(JSON.parse(result.stderr).code).eq('SOURCE_CHANGED');
    expect(result.stdout).eq(''); expect(result.stderr).not.include('private-value');
    expect(await fs.readdir(output)).deep.eq([]);
    const after = new Database(filename);
    expect(liveIds(after)).deep.eq([{save_id: 0}, {save_id: 2}, {save_id: 7}, {save_id: 9}]);
    after.close();
  }).timeout(30000);

  it('requires unique bounded arguments and exclusive apply consent before opening storage', async () => {
    const before = await fs.readFile(filename);
    for (const argv of [args().slice(1), [...args(), '--apply'], [...args(), '--max-states', '4'],
      [...args().slice(0, -1), '4097'], [...args().slice(0, -1), 'Infinity']]) {
      const result = await run(argv);
      expect(result.code, result.stderr).eq(2); expect(result.stdout).eq('');
      expect(JSON.parse(result.stderr)).deep.eq({status: 'ERROR', code: 'INVALID_ARGUMENTS'});
    }
    expect(await fs.readFile(filename)).deep.eq(before);
    expect(await fs.readdir(output)).deep.eq([]);
  }).timeout(30000);

  async function crashHook(boundary: 'publication' | 'delete' | 'commit' | 'hydrate') {
    const marker = join(workspace, 'interrupted');
    const preload = join(workspace, 'crash.cjs');
    const hook = `
      const fs = require('node:fs');
      const crash = () => { fs.writeFileSync(${JSON.stringify(marker)}, 'reached'); process.kill(process.pid, 'SIGKILL'); };
      const boundary = ${JSON.stringify(boundary)};
      if (boundary === 'publication') {
        const rename = fs.promises.rename.bind(fs.promises);
        fs.promises.rename = async (...args) => { await rename(...args); crash(); };
      } else if (boundary === 'commit') {
        const write = process.stdout.write.bind(process.stdout);
        process.stdout.write = (...args) => {
          if (String(args[0]).includes('"status":"ARCHIVED"')) crash();
          return write(...args);
        };
      } else {
        const Database = require(${JSON.stringify(require.resolve('better-sqlite3'))});
        const prepare = Database.prototype.prepare;
        Database.prototype.prepare = function(sql) {
          const statement = prepare.call(this, sql);
          const target = boundary === 'delete' ? sql.startsWith('DELETE FROM games WHERE game_id = ? AND save_id = ?') :
            sql.startsWith('INSERT INTO games (game_id, players, save_id, game, status, created_time)');
          if (target) {
            const run = statement.run.bind(statement);
            statement.run = (...args) => { run(...args); crash(); };
          }
          return statement;
        };
      }
    `;
    await fs.writeFile(preload, hook);
    return {preload, marker};
  }

  for (const boundary of ['publication', 'delete', 'commit'] as const) {
    it(`recovers exact history after process death at ${boundary}`, async () => {
      const plan = await preview();
      const {preload, marker} = await crashHook(boundary);
      const interrupted = await run(applyArgs(plan.sourceRevision), preload);
      expect(interrupted.code).not.eq(0);
      expect(await fs.readFile(marker, 'utf8')).eq('reached');
      expect(interrupted.stdout).eq('');
      await checkHistory(boundary === 'commit' ? [0, 9] : [0, 2, 7, 9]);
      const db = new Database(filename);
      const exists = db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'history_archives'").get();
      expect(exists !== undefined).eq(boundary === 'commit');
      db.close();
      if (boundary === 'publication') {
        const locked = await run(applyArgs(plan.sourceRevision));
        expect(locked.code).eq(1); expect(JSON.parse(locked.stderr).code).eq('ARCHIVE_CONFLICT');
        // The terminated fixture process owned this lock.
        await fs.unlink(join(output, '.writer.lock'));
      }
      const retry = await run(applyArgs(plan.sourceRevision));
      expect(retry.code, retry.stderr).eq(0);
      expect(JSON.parse(retry.stdout).status).eq(boundary === 'commit' ? 'ALREADY_ARCHIVED' : 'ARCHIVED');
      await checkHistory([0, 9]);
    }).timeout(30000);
  }

  it('rolls back interrupted hydration and permits a clean subprocess retry', async () => {
    const plan = await preview();
    expect((await run(applyArgs(plan.sourceRevision))).code).eq(0);
    const {preload, marker} = await crashHook('hydrate');
    const child = join(workspace, 'hydrate.cjs');
    await fs.writeFile(child, `
      const Database = require(${JSON.stringify(require.resolve('better-sqlite3'))});
      const {SQLiteArchiveRetention} = require(${JSON.stringify(resolve('src/server/archive/SQLiteArchiveRetention.ts'))});
      const db = new Database(${JSON.stringify(filename)});
      const retention = new SQLiteArchiveRetention(db, ${JSON.stringify(filename)}, ${JSON.stringify({root: output, workspace})});
      retention.withHydratedHistory(${JSON.stringify(gameId)}, () => {
        db.prepare('DELETE FROM games WHERE game_id = ? AND save_id > 2').run(${JSON.stringify(gameId)});
      }).then(() => db.close()).catch(() => { db.close(); process.exitCode = 1; });
    `);
    try {
      await execute(process.execPath, ['--require', preload, '--import=tsx', child], {timeout: 15000});
      expect.fail('hydration was not interrupted');
    } catch (error) {
      expect((error as {code: number}).code).not.eq(0);
    }
    expect(await fs.readFile(marker, 'utf8')).eq('reached');
    await checkHistory([0, 9]);
    const result = await execute(process.execPath, ['--import=tsx', child], {timeout: 15000});
    expect(result.stdout).eq(''); expect(result.stderr).eq('');
    const db = new Database(filename);
    try {
      expect(liveIds(db)).deep.eq([{save_id: 0}, {save_id: 2}]);
      const catalog = new ArchiveCatalog(db, output, workspace);
      expect(catalog.getBinding(gameId)).eq(undefined);
      expect(await catalog.getGameVersion(gameId, 2)).deep.eq(states[1]);
      expect(await catalog.getSaveIds(gameId)).deep.eq([0, 2]);
    } finally {
      db.close();
    }
  }).timeout(30000);
});
