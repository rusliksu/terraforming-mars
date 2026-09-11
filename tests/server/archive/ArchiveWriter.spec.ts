import {expect} from 'chai';
import fs from 'node:fs/promises';
import {join} from 'node:path';
import {mock} from 'node:test';
import {HistorySource} from '@/server/archive/HistorySource';
import {exportHistory} from '@/server/archive/ArchiveWriter';
import {readManifest, readSave, verifyArchive} from '@/server/archive/ArchiveReader';

(process.platform === 'win32' ? describe : describe.skip)('ArchiveWriter', () => {
  let root: string;
  let source: HistorySource;
  let output: string;
  const gameId = 'g000000000002';
  const state = (saveId: number) => ({id: gameId, lastSaveId: saveId, phase: saveId === 22 ? 'end' : 'action', stable: 'x'.repeat(2000), log: Array.from({length: saveId}, (_, i) => i)});
  beforeEach(async () => {
    const lab = 'D:/tm-db/smartbot-lab/archive-writer-tests';
    await fs.mkdir(lab, {recursive: true});
    root = await fs.mkdtemp(join(lab, 'case-'));
    output = join(root, 'archives');
    const input = join(root, 'source');
    await fs.mkdir(output);
    await fs.mkdir(join(input, 'history'), {recursive: true});
    for (let i = 0; i <= 22; i++) {
      await fs.writeFile(join(input, 'history', `${gameId}-${i}.json`), JSON.stringify(state(i)));
    }
    await fs.writeFile(join(input, gameId + '.json'), JSON.stringify(state(22)));
    source = new HistorySource({kind: 'files', path: input, gameId, offline: true});
  });
  afterEach(() => {
    mock.restoreAll();
  });

  it('publishes all states in independent groups and retries without replacing a valid archive', async () => {
    const before = await source.scan();
    const receipt = await exportHistory(source, output);
    const archive = join(output, receipt.revision);
    expect(receipt.status).eq('VERIFIED');
    expect(receipt.count).eq(23);
    expect((await readManifest(archive)).groups.map((group) => group.count)).deep.eq([20, 3]);
    for (let i = 0; i <= 22; i++) {
      expect(await readSave(archive, i)).deep.eq(state(i));
    }
    const stamp = (await fs.stat(join(archive, 'manifest.json'))).mtimeMs;
    expect((await exportHistory(source, output)).status).eq('ALREADY_VERIFIED');
    expect((await fs.stat(join(archive, 'manifest.json'))).mtimeMs).eq(stamp);
    expect((await source.scan()).fingerprint).eq(before.fingerprint);
    expect(JSON.stringify(receipt)).not.include(gameId);
    expect((await fs.readdir(output)).filter((name) => name.startsWith('.pending-'))).deep.eq([]);
  });

  it('treats formatting-only changes as the same immutable JSON revision', async () => {
    const receipt = await exportHistory(source, output);
    const receiptPath = join(output, receipt.revision, 'receipt.json');
    const original = await fs.readFile(receiptPath, 'utf8');
    expect(JSON.parse(original).rawSourceBytes).eq((await source.scan()).rawBytes);
    for (let i = 0; i <= 22; i++) {
      await fs.writeFile(join(source.path, 'history', `${gameId}-${i}.json`), JSON.stringify(state(i), null, 2));
    }
    await fs.writeFile(join(source.path, gameId + '.json'), JSON.stringify(state(22), null, 2));
    const retry = await exportHistory(source, output);
    expect(retry.revision).eq(receipt.revision);
    expect(retry.status).eq('ALREADY_VERIFIED');
    expect((await source.scan()).rawBytes).greaterThan(JSON.parse(original).rawSourceBytes);
    expect(retry).deep.eq({...receipt, status: 'ALREADY_VERIFIED'});
    expect(await fs.readFile(receiptPath, 'utf8')).eq(original);
  });

  it('persists the complete receipt for gapped history and refuses altered receipt fields', async () => {
    for (const saveId of [0, 3, 4]) {
      await fs.unlink(join(source.path, 'history', `${gameId}-${saveId}.json`));
    }
    const before = await source.scan();
    const receipt = await exportHistory(source, output);
    const path = join(output, receipt.revision, 'receipt.json');
    const bytes = await fs.readFile(path, 'utf8');
    const persisted = JSON.parse(bytes);
    expect(persisted).deep.eq({...receipt, format: 'tm-history-archive', codec: 'structural-json-v1',
      rawSourceBytes: before.rawBytes, canonicalStateBytes: before.canonicalBytes,
      count: 20, verifiedCount: 20, groups: 1,
      coverage: {firstSaveId: 1, lastSaveId: 22, gaps: [{first: 3, last: 4}],
        startsAtZero: false, endsAtCompletedState: true, actionCoverage: 'unknown'}});
    expect(bytes).not.include(gameId);
    expect(bytes).not.include('stable');
    for (const alteration of [{codec: 'invalid'}, {coverage: {}}, {rawSourceBytes: -1}]) {
      const damaged = JSON.stringify({...persisted, ...alteration});
      await fs.writeFile(path, damaged);
      await refused(exportHistory(source, output), 'ARCHIVE_CONFLICT');
      expect(await fs.readFile(path, 'utf8')).eq(damaged);
    }
  });

  it('refuses drift before publication and leaves an earlier revision readable', async () => {
    const receipt = await exportHistory(source, output);
    const scan = source.scan.bind(source);
    let passes = 0;
    mock.method(source, 'scan', async (...args: Parameters<HistorySource['scan']>) => {
      if (++passes === 3) {
        await fs.writeFile(join(source.path, 'history', gameId + '-2.json'), JSON.stringify({...state(2), corrected: true}));
      }
      return scan(...args);
    });
    await refused(exportHistory(source, output), 'SOURCE_CHANGED');
    expect(await verifyArchive(join(output, receipt.revision))).eq(23);
    expect((await fs.readdir(output)).filter((name) => name.startsWith('archive-'))).deep.eq([receipt.revision]);
  });

  it('refuses conflicts instead of repairing or replacing the existing output', async () => {
    const receipt = await exportHistory(source, output);
    const target = join(output, receipt.revision, 'group-0000.json.gz');
    await fs.writeFile(target, 'damaged');
    await refused(exportHistory(source, output), 'ARCHIVE_CONFLICT');
    expect(await fs.readFile(target, 'utf8')).eq('damaged');
  });

  it('leaves no published revision on a rename failure and allows a safe retry', async () => {
    const before = await source.scan();
    mock.method(fs, 'rename', async () => {
      throw new Error('private failure');
    });
    await refused(exportHistory(source, output), 'IO_FAILURE');
    expect((await fs.readdir(output)).filter((name) => name.startsWith('archive-'))).deep.eq([]);
    expect((await source.scan()).fingerprint).eq(before.fingerprint);
    mock.restoreAll();
    expect((await exportHistory(source, output)).status).eq('VERIFIED');
  });

  it('keeps a valid revision after interruption following rename', async () => {
    const rename = fs.rename.bind(fs);
    mock.method(fs, 'rename', async (...args: Parameters<typeof fs.rename>) => {
      await rename(...args); throw new Error('interrupted');
    });
    await refused(exportHistory(source, output), 'IO_FAILURE');
    const revisions = (await fs.readdir(output)).filter((name) => name.startsWith('archive-'));
    expect(revisions.length).eq(1);
    expect(await verifyArchive(join(output, revisions[0]))).eq(23);
    mock.restoreAll();
    expect((await exportHistory(source, output)).status).eq('ALREADY_VERIFIED');
  });

  it('refuses an output link or a held writer lock', async () => {
    const link = output + '-link';
    await fs.symlink(output, link, 'junction');
    await refused(exportHistory(source, link), 'SOURCE_UNSUPPORTED');
    await fs.writeFile(join(output, '.writer.lock'), 'held');
    await refused(exportHistory(source, output), 'ARCHIVE_CONFLICT');
    expect(await fs.readFile(join(output, '.writer.lock'), 'utf8')).eq('held');
  });

  it('refuses corruption introduced during writing before publication', async () => {
    const before = await source.scan();
    const open = fs.open.bind(fs);
    mock.method(fs, 'open', async (...args: Parameters<typeof fs.open>) => {
      const handle = await open(...args);
      if (String(args[0]).endsWith('.json.gz') && args[1] === 'wx') {
        const write = handle.writeFile.bind(handle);
        mock.method(handle, 'writeFile', async () => write('corrupted write'));
      }
      return handle;
    });
    await refused(exportHistory(source, output), 'ARCHIVE_CORRUPT');
    expect((await fs.readdir(output)).filter((name) => name.startsWith('archive-'))).deep.eq([]);
    expect((await source.scan()).fingerprint).eq(before.fingerprint);
  });

  it('serializes concurrent exports and creates a separate revision for corrected history', async () => {
    const [first, second] = await Promise.allSettled([exportHistory(source, output), exportHistory(source, output)]);
    expect(first.status).eq('fulfilled');
    expect(second.status).eq('rejected');
    if (first.status !== 'fulfilled' || second.status !== 'rejected') {
      throw new Error('unexpected concurrency result');
    }
    expect((second.reason as Error).message).eq('ARCHIVE_CONFLICT');
    await fs.writeFile(join(source.path, 'history', gameId + '-2.json'), JSON.stringify({...state(2), corrected: true}));
    const revised = await exportHistory(source, output);
    expect(revised.revision).not.eq(first.value.revision);
    expect(await readSave(join(output, first.value.revision), 2)).deep.eq(state(2));
    expect(await readSave(join(output, revised.revision), 2)).deep.eq({...state(2), corrected: true});
  });

  it('sanitizes a lock release failure and retains the lock for inspection', async () => {
    const open = fs.open.bind(fs);
    mock.method(fs, 'open', async (...args: Parameters<typeof fs.open>) => {
      const handle = await open(...args);
      if (String(args[0]).endsWith('.writer.lock') && args[1] === 'wx') {
        const close = handle.close.bind(handle);
        mock.method(handle, 'close', async () => {
          await close(); throw new Error('private close failure');
        });
      }
      return handle;
    });
    await refused(exportHistory(source, output), 'IO_FAILURE');
    expect((await fs.readdir(output)).includes('.writer.lock')).eq(true);
    const revisions = (await fs.readdir(output)).filter((name) => name.startsWith('archive-'));
    expect(await verifyArchive(join(output, revisions[0]))).eq(23);
  });
});

async function refused(operation: Promise<unknown>, code: string) {
  try {
    await operation; expect.fail('operation accepted');
  } catch (error) {
    expect((error as Error).message).eq(code);
  }
}
