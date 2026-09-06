import {expect} from 'chai';
import {mkdtemp, mkdir, writeFile, symlink, readFile, lstat} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {canonical, coverageOf, digest, groupFilename, Json, LIMITS, Manifest, sourceDigest} from '@/server/archive/ArchiveFormat';
import {readManifest, readSave, verifyArchive} from '@/server/archive/ArchiveReader';

(process.platform === 'win32' ? describe : describe.skip)('ArchiveReader', () => {
  let root: string;
  const source = {kind: 'files' as const, schema: 'unknown', engineRevision: 'unknown'};
  const states: Array<Json> = [{phase: 'action', log: []}, {phase: 'action', log: ['played']}, {phase: 'end', log: ['played', 'done']}];
  const ids = [3, 7, 9];
  let manifest: Manifest;

  beforeEach(async () => {
    const lab = resolve('D:/tm-db/smartbot-lab/archive-reader-tests');
    expect(lab.toLowerCase().startsWith('d:')).eq(true);
    await mkdir(lab, {recursive: true});
    expect((await lstat(lab)).isSymbolicLink()).eq(false);
    root = await mkdtemp(join(lab, 'case-'));
    const entries = states.map((state, i) => ({saveId: ids[i], stateHash: digest(canonical(state))}));
    // Independent fixture records, not the delta generator.
    const records = [
      {kind: 'full', ...entries[0], state: states[0]},
      {kind: 'delta', ...entries[1], baseSaveId: 3, baseStateHash: entries[0].stateHash,
        operations: [{op: 'tail', path: ['log'], start: 0, values: ['played']}]},
      {kind: 'full', ...entries[2], state: states[2]},
    ];
    const bytes = Buffer.from(JSON.stringify(records));
    const compressed = gzipSync(bytes);
    manifest = {format: 'tm-history-archive', version: 1, codec: 'structural-json-v1', compression: 'gzip',
      canonicalEncoding: 'tm-json-v1', source, sourceDigest: sourceDigest(source, entries), coverage: coverageOf(entries), count: 3,
      groups: [{ordinal: 0, firstSaveId: 3, lastSaveId: 9, count: 3, compressedBytes: compressed.length,
        decodedBytes: bytes.length, compressedHash: digest(compressed), entries}]};
    await writeFile(join(root, groupFilename(0)), compressed);
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  });

  it('returns exact first, middle and final states and explicitly refuses gaps', async () => {
    for (let i = 0; i < ids.length; i++) {
      expect(await readSave(root, ids[i])).deep.eq(states[i]);
    }
    expect(await verifyArchive(root)).eq(3);
    expect((await readManifest(root)).coverage.gaps).deep.eq([{first: 4, last: 6}, {first: 8, last: 8}]);
    try {
      await readSave(root, 6); expect.fail('missing save accepted');
    } catch (error) {
      expect((error as Error).message).eq('SAVE_NOT_RECORDED');
    }
  });

  it('rejects altered and truncated bytes without exposing their contents', async () => {
    await writeFile(join(root, groupFilename(0)), 'private content');
    try {
      await readSave(root, 3); expect.fail();
    } catch (error) {
      expect((error as Error).message).eq('ARCHIVE_CORRUPT');
    }
  });

  it('validates version, counts, ordering, coverage and expansion bounds before yielding', async () => {
    for (const change of [
      {version: 99}, {count: 4}, {coverage: {...manifest.coverage, startsAtZero: true}},
      {groups: [{...manifest.groups[0], decodedBytes: LIMITS.groupBytes + 1}]},
      {groups: [{...manifest.groups[0], entries: manifest.groups[0].entries.slice().reverse()}]},
    ]) {
      await writeFile(join(root, 'manifest.json'), JSON.stringify({...manifest, ...change}));
      let refused = false;
      try {
        await readSave(root, 3);
      } catch {
        refused = true;
      }
      expect(refused).eq(true);
    }
  });

  it('enforces declared decoded size while inflating even when compressed hash is correct', async () => {
    manifest.groups[0].decodedBytes = 10;
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
    try {
      await readSave(root, 3); expect.fail();
    } catch (error) {
      expect((error as Error).message).eq('ARCHIVE_CORRUPT');
    }
  });

  it('rejects a mismatched delta base and an altered resulting state after recompression', async () => {
    const entries = manifest.groups[0].entries;
    for (const delta of [
      {baseSaveId: 2, baseStateHash: entries[0].stateHash, operations: []},
      {baseSaveId: 3, baseStateHash: '0'.repeat(64), operations: []},
      {baseSaveId: 3, baseStateHash: entries[0].stateHash, operations: [{op: 'set', path: ['phase'], value: 'wrong'}]},
    ]) {
      const bytes = Buffer.from(JSON.stringify([
        {kind: 'full', ...entries[0], state: states[0]},
        {kind: 'delta', ...entries[1], ...delta},
        {kind: 'full', ...entries[2], state: states[2]},
      ]));
      const compressed = gzipSync(bytes);
      Object.assign(manifest.groups[0], {compressedBytes: compressed.length, decodedBytes: bytes.length, compressedHash: digest(compressed)});
      await writeFile(join(root, groupFilename(0)), compressed);
      await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
      try {
        await readSave(root, 7); expect.fail();
      } catch (error) {
        expect((error as Error).message).eq('ARCHIVE_CORRUPT');
      }
    }
  });

  it('reads an independent single-frame group without reading another damaged group', async () => {
    const entry = manifest.groups[0].entries[2];
    const bytes = Buffer.from(JSON.stringify([{kind: 'full', ...entry, state: states[2]}]));
    const compressed = gzipSync(bytes);
    manifest.groups[0].entries = manifest.groups[0].entries.slice(0, 2);
    Object.assign(manifest.groups[0], {count: 2, lastSaveId: 7});
    manifest.groups.push({ordinal: 1, count: 1, firstSaveId: 9, lastSaveId: 9, entries: [entry],
      compressedBytes: compressed.length, decodedBytes: bytes.length, compressedHash: digest(compressed)});
    await writeFile(join(root, groupFilename(1)), compressed);
    await writeFile(join(root, groupFilename(0)), 'damaged');
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
    expect(await readSave(root, 9)).deep.eq(states[2]);
    try {
      await verifyArchive(root); expect.fail();
    } catch (error) {
      expect((error as Error).message).eq('ARCHIVE_CORRUPT');
    }
  });

  it('rejects a truncated gzip even when its truncated checksum is declared', async () => {
    const compressed = (await readFile(join(root, groupFilename(0)))).subarray(0, -4);
    Object.assign(manifest.groups[0], {compressedBytes: compressed.length, compressedHash: digest(compressed)});
    await writeFile(join(root, groupFilename(0)), compressed);
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
    try {
      await verifyArchive(root); expect.fail();
    } catch (error) {
      expect((error as Error).message).eq('ARCHIVE_CORRUPT');
    }
  });

  it('refuses a junction as an archive root', async () => {
    const link = root + '-link';
    await symlink(root, link, 'junction');
    try {
      await readSave(link, 3); expect.fail();
    } catch (error) {
      expect((error as Error).message).eq('ARCHIVE_CORRUPT');
    }
    expect((await readFile(join(root, 'manifest.json'))).length).greaterThan(0);
  });
});
