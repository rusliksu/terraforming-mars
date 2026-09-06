import {expect} from 'chai';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {promisify} from 'node:util';
import {mock} from 'node:test';
import Database from 'better-sqlite3';
import {readSave} from '@/server/archive/ArchiveReader';
import {HistorySource} from '@/server/archive/HistorySource';
import {preflight} from '@/server/archive/ArchivePreflight';
import {exportHistory} from '@/server/archive/ArchiveWriter';

const execute = promisify(execFile);
const supported = process.platform === 'win32' || (process.platform === 'linux' && process.env.CI === 'true');

(supported ? describe : describe.skip)('ArchivePlatform', () => {
  let workspace: string;
  let input: string;
  let output: string;
  const gameId = 'g000000000004';
  const states = [
    {id: gameId, lastSaveId: 0, phase: 'action', privateHand: ['not-for-output']},
    {id: gameId, lastSaveId: 2, phase: 'end', privateHand: ['not-for-output']},
  ];
  const args = () => ['--offline', '--source', 'files', '--input', input,
    '--game', gameId, '--output', output, '--workspace', workspace];
  async function run(argv: Array<string>) {
    try {
      const result = await execute(process.execPath,
        ['--import=tsx', resolve('src/server/tools/archive-game-history.ts'), ...argv],
        {timeout: 15000, maxBuffer: 65536});
      return {...result, code: 0};
    } catch (error) {
      return error as {stdout: string; stderr: string; code: number};
    }
  }
  beforeEach(async () => {
    const lab = process.platform === 'win32' ? 'D:/tm-db/smartbot-lab/archive-platform-tests' : tmpdir();
    await fs.mkdir(lab, {recursive: true});
    workspace = await fs.mkdtemp(join(lab, 'tm-archive-'));
    input = join(workspace, 'input'); output = join(workspace, 'output');
    await fs.mkdir(join(input, 'history'), {recursive: true});
    await fs.mkdir(output);
    for (const state of states) {
      await fs.writeFile(join(input, 'history', `${gameId}-${state.lastSaveId}.json`), JSON.stringify(state));
    }
    await fs.writeFile(join(input, gameId + '.json'), JSON.stringify(states[1]));
  });
  afterEach(() => mock.restoreAll());

  it('previews a stable revision and space budget without producing an archive', async () => {
    const current = join(input, gameId + '.json');
    const before = await fs.readFile(current);
    const result = await run([...args(), '--preview']);
    expect(result.code).eq(0); expect(result.stderr).eq('');
    const report = JSON.parse(result.stdout);
    expect(report.status).eq('READY'); expect(report.count).eq(2);
    expect(report.sourceRevision).match(/^[a-f0-9]{64}$/);
    expect(report.requiredFreeBytes).eq(3_489_660_928);
    expect(report.availableBytes).at.least(report.requiredFreeBytes);
    expect(result.stdout).not.include(gameId); expect(result.stdout).not.include('not-for-output');
    expect(await fs.readdir(output)).deep.eq([]);
    expect(await fs.readFile(current)).deep.eq(before);
  });

  it('exports and retries inside an explicit workspace with exact private readback', async () => {
    const result = await run(args());
    expect(result.code).eq(0); expect(result.stderr).eq('');
    const receipt = JSON.parse(result.stdout);
    const archive = join(output, receipt.revision);
    expect(receipt.status).eq('VERIFIED');
    for (const state of states) {
      expect(await readSave(archive, state.lastSaveId)).deep.eq(state);
    }
    if (process.platform === 'linux') {
      expect((await fs.stat(archive)).mode & 0o777).eq(0o700);
      expect((await fs.stat(join(archive, 'manifest.json'))).mode & 0o777).eq(0o600);
    }
    const retry = await run(args());
    expect(retry.code).eq(0); expect(JSON.parse(retry.stdout).status).eq('ALREADY_VERIFIED');
    expect(retry.stdout).not.include('not-for-output');
  });

  it('refuses output outside the declared workspace before writing files', async () => {
    const privateChild = join(workspace, 'input');
    await fs.chmod(privateChild, 0o700);
    const result = await run([...args().slice(0, -1), privateChild, '--preview']);
    expect(result.code).eq(1); expect(result.stdout).eq('');
    expect(JSON.parse(result.stderr).code).eq('SOURCE_UNSUPPORTED');
    expect(await fs.readdir(output)).deep.eq([]);
  });

  it('previews and exports an actual read-only SQLite copy in the workspace', async () => {
    const file = join(workspace, 'copy.sqlite');
    const db = new Database(file);
    db.exec('CREATE TABLE games (game_id TEXT, save_id INTEGER, game TEXT)');
    for (const state of states) {
      db.prepare('INSERT INTO games VALUES (?, ?, ?)').run(gameId, state.lastSaveId, JSON.stringify(state));
    }
    db.close();
    const before = await fs.readFile(file);
    const argv = ['--offline', '--source', 'sqlite', '--input', file,
      '--game', gameId, '--output', output, '--workspace', workspace];
    const preview = await run([...argv, '--preview']);
    expect(preview.code).eq(0); expect(JSON.parse(preview.stdout).databaseBytes).eq(before.length);
    expect(await fs.readdir(output)).deep.eq([]);
    const result = await run(argv);
    expect(result.code).eq(0);
    const archive = join(output, JSON.parse(result.stdout).revision);
    for (const state of states) {
      expect(await readSave(archive, state.lastSaveId)).deep.eq(state);
    }
    expect(await fs.readFile(file)).deep.eq(before);
  });

  it('refuses insufficient headroom and admits the exact capacity boundary without writes', async () => {
    const source = new HistorySource({kind: 'files', path: input, gameId, offline: true, workspace});
    const stat = await fs.statfs(output, {bigint: true});
    let available = 3_489_660_927n;
    mock.method(fs, 'statfs', async () => ({...stat, bsize: 1n, bavail: available}));
    try {
      await preflight(source, output); expect.fail('insufficient capacity accepted');
    } catch (error) {
      expect((error as Error).message).eq('INSUFFICIENT_SPACE');
    }
    available++;
    expect((await preflight(source, output)).summary.availableBytes).eq(3_489_660_928);
    expect(await fs.readdir(output)).deep.eq([]);
  });

  (process.platform === 'linux' ? it : it.skip)('requires a private owned workspace on Linux', async () => {
    const missing = await run(args().slice(0, -2));
    expect(missing.code).eq(1); expect(missing.stdout).eq('');
    await fs.chmod(workspace, 0o755);
    const publicRoot = await run(args());
    expect(publicRoot.code).eq(1); expect(publicRoot.stdout).eq('');
    expect(JSON.parse(publicRoot.stderr).code).eq('SOURCE_UNSUPPORTED');
    expect(await fs.readdir(output)).deep.eq([]);
  });

  (process.platform === 'linux' ? it : it.skip)('reports a post-rename directory sync failure and verifies a later retry', async () => {
    const source = new HistorySource({kind: 'files', path: input, gameId, offline: true, workspace});
    const before = await source.scan();
    const open = fs.open.bind(fs);
    mock.method(fs, 'open', async (...args: Parameters<typeof fs.open>) => {
      const handle = await open(...args);
      if (String(args[0]) === output && args[1] === 'r') {
        mock.method(handle, 'sync', async () => {
          throw new Error('private sync failure');
        });
      }
      return handle;
    });
    try {
      await exportHistory(source, output); expect.fail('sync failure accepted');
    } catch (error) {
      expect((error as Error).message).eq('IO_FAILURE');
    }
    mock.restoreAll();
    expect((await source.scan()).fingerprint).eq(before.fingerprint);
    expect((await fs.readdir(output)).filter((name) => name.startsWith('archive-')).length).eq(1);
    expect((await exportHistory(source, output)).status).eq('ALREADY_VERIFIED');
  });
});
