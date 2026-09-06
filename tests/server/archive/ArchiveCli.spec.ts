import {expect} from 'chai';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {promisify} from 'node:util';
import Database from 'better-sqlite3';
import {readSave} from '@/server/archive/ArchiveReader';

const execute = promisify(execFile);
const cli = resolve('src/server/tools/archive-game-history.ts');
async function run(args: Array<string>) {
  try {
    const result = await execute(process.execPath, ['--import=tsx', cli, ...args], {timeout: 15000, maxBuffer: 65536});
    return {...result, code: 0};
  } catch (error) {
    const result = error as {stdout: string; stderr: string; code: number};
    return result;
  }
}

(process.platform === 'win32' ? describe : describe.skip)('ArchiveCli', () => {
  let root: string;
  let output: string;
  let input: string;
  const gameId = 'g000000000003';
  const state = {id: gameId, lastSaveId: 4, phase: 'end', privateHand: ['private-card']};
  const args = () => ['--offline', '--source', 'files', '--input', input, '--game', gameId, '--output', output];
  beforeEach(async () => {
    const lab = 'D:/tm-db/smartbot-lab/archive-cli-tests';
    await fs.mkdir(lab, {recursive: true});
    root = await fs.mkdtemp(join(lab, 'case-'));
    input = join(root, 'input'); output = join(root, 'output');
    await fs.mkdir(join(input, 'history'), {recursive: true});
    await fs.mkdir(output);
    await fs.writeFile(join(input, 'history', gameId + '-4.json'), JSON.stringify(state));
    await fs.writeFile(join(input, gameId + '.json'), JSON.stringify(state));
  });

  it('exports one file history through the process boundary with private aggregate output and safe retry', async () => {
    const first = await run(args());
    expect(first.code).eq(0); expect(first.stderr).eq('');
    const receipt = JSON.parse(first.stdout);
    expect(receipt.status).eq('VERIFIED'); expect(receipt.verifiedCount).eq(1);
    expect(receipt.coverage.startsAtZero).eq(false);
    expect(first.stdout).not.include(gameId); expect(first.stdout).not.include('private-card');
    expect(await readSave(join(output, receipt.revision), 4)).deep.eq(state);
    const second = await run(args());
    expect(second.code).eq(0); expect(JSON.parse(second.stdout).status).eq('ALREADY_VERIFIED');
  });

  it('exports a real SQLite copy without changing its bytes', async () => {
    const file = join(root, 'copy.sqlite');
    const db = new Database(file);
    db.exec('CREATE TABLE games (game_id TEXT, save_id INTEGER, game TEXT)');
    db.prepare('INSERT INTO games VALUES (?, ?, ?)').run(gameId, 4, JSON.stringify(state));
    db.close();
    const before = await fs.readFile(file);
    const result = await run(['--offline', '--source', 'sqlite', '--input', file, '--game', gameId, '--output', output]);
    expect(result.code).eq(0); expect(result.stderr).eq('');
    expect(await readSave(join(output, JSON.parse(result.stdout).revision), 4)).deep.eq(state);
    expect(await fs.readFile(file)).deep.eq(before);
  });

  it('refuses missing consent, unknown or duplicate flags without exposing supplied values or writing output', async () => {
    for (const invalid of [args().slice(1), [...args(), '--force', 'private-value'], [...args(), '--game', 'private-value']]) {
      const result = await run(invalid);
      expect(result.code).eq(2); expect(result.stdout).eq('');
      expect(JSON.parse(result.stderr)).deep.eq({status: 'ERROR', code: 'INVALID_ARGUMENTS'});
    }
    expect(await fs.readdir(output)).deep.eq([]);
  });

  it('refuses unsafe roots and unfinished input with code-only errors', async () => {
    const linked = output + '-link';
    await fs.symlink(output, linked, 'junction');
    const publicRoot = join(root, 'public');
    const checkoutOutput = join(root, 'checkout', 'archives');
    await fs.mkdir(publicRoot);
    await fs.mkdir(checkoutOutput, {recursive: true});
    await fs.mkdir(join(root, 'checkout', '.git'));
    for (const destination of [linked, publicRoot, checkoutOutput]) {
      const result = await run([...args().slice(0, -1), destination]);
      expect(result.code).eq(1); expect(result.stdout).eq('');
      expect(JSON.parse(result.stderr)).deep.eq({status: 'ERROR', code: 'SOURCE_UNSUPPORTED'});
    }
    await fs.writeFile(join(input, gameId + '.json'), JSON.stringify({...state, phase: 'action'}));
    const result = await run(args());
    expect(result.code).eq(1); expect(JSON.parse(result.stderr).code).eq('SOURCE_NOT_COMPLETED');
    expect(await fs.readdir(output)).deep.eq([]);
  });
});
