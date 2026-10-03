import {expect} from 'chai';
import {seedOfficialMapLibrary} from '../../src/server/database/seedOfficialMapLibrary';
import {OFFICIAL_MAP_LIBRARY_BOARDS, FAN_MAP_LIBRARY_BOARDS, officialMapLibraryId} from '../../src/common/boards/officialMapLibrary';
import {decodeCustomBoard} from '../../src/common/boards/customBoardCodec';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {restoreTestDatabase, setTestDatabase} from '../testing/setup';

describe('seedOfficialMapLibrary', () => {
  afterEach(() => {
    restoreTestDatabase();
  });

  it('inserts one approved, official entry per official board, and one approved, fanmade entry per fan board', async () => {
    const db = new InMemoryDatabase();
    setTestDatabase(db);

    await seedOfficialMapLibrary();

    const entries = await db.listMapLibraryEntries();
    expect(entries.length).eq(OFFICIAL_MAP_LIBRARY_BOARDS.length + FAN_MAP_LIBRARY_BOARDS.length);
    for (const {boardName} of OFFICIAL_MAP_LIBRARY_BOARDS) {
      const entry = await db.getMapLibraryEntry(officialMapLibraryId(boardName));
      expect(entry?.origin).eq('official');
      expect(entry?.status).eq('approved');
    }
    for (const {boardName} of FAN_MAP_LIBRARY_BOARDS) {
      const entry = await db.getMapLibraryEntry(officialMapLibraryId(boardName));
      expect(entry?.origin).eq('fanmade');
      expect(entry?.status).eq('approved');
    }
    for (const entry of entries) {
      // Every built-in code must still decode.
      expect(() => decodeCustomBoard(entry.code)).to.not.throw();
    }
  });

  it('is idempotent -- re-seeding does not duplicate existing rows', async () => {
    const db = new InMemoryDatabase();
    setTestDatabase(db);

    await seedOfficialMapLibrary();
    await seedOfficialMapLibrary();

    expect((await db.listMapLibraryEntries()).length).eq(OFFICIAL_MAP_LIBRARY_BOARDS.length + FAN_MAP_LIBRARY_BOARDS.length);
  });

  it('does not resurrect a row an admin deleted, until the next seed call (boot)', async () => {
    const db = new InMemoryDatabase();
    setTestDatabase(db);
    await seedOfficialMapLibrary();

    const {boardName} = OFFICIAL_MAP_LIBRARY_BOARDS[0];
    const id = officialMapLibraryId(boardName);
    await db.deleteMapLibraryEntry(id);
    expect(await db.getMapLibraryEntry(id)).is.undefined;

    // Simulating the next server boot: the deleted official row comes back, by design.
    await seedOfficialMapLibrary();
    expect(await db.getMapLibraryEntry(id)).is.not.undefined;
  });

  it('self-heals a fan board that was previously (wrongly) seeded as official, preserving its description/submittedBy/createdAt', async () => {
    const db = new InMemoryDatabase();
    setTestDatabase(db);
    const {boardName, code} = FAN_MAP_LIBRARY_BOARDS[0];
    const id = officialMapLibraryId(boardName);
    // Simulate the pre-fix state: this fan board's row was seeded with the wrong origin.
    await db.insertMapLibraryEntry({
      id, code, description: 'A note an admin added', submittedBy: 'someone', origin: 'official', status: 'approved', createdAt: 1234,
    });

    await seedOfficialMapLibrary();

    const fixed = await db.getMapLibraryEntry(id);
    expect(fixed?.origin).eq('fanmade');
    expect(fixed?.status).eq('approved');
    expect(fixed?.description).eq('A note an admin added');
    expect(fixed?.submittedBy).eq('someone');
    expect(fixed?.createdAt).eq(1234);
    // No duplicate row was created alongside the corrected one.
    expect((await db.listMapLibraryEntries()).filter((e) => e.id === id).length).eq(1);
  });

  it('leaves an already-correctly-tagged entry untouched (no needless delete+reinsert)', async () => {
    const db = new InMemoryDatabase();
    setTestDatabase(db);
    await seedOfficialMapLibrary();

    const {boardName} = FAN_MAP_LIBRARY_BOARDS[0];
    const id = officialMapLibraryId(boardName);
    const before = await db.getMapLibraryEntry(id);

    await seedOfficialMapLibrary();

    const after = await db.getMapLibraryEntry(id);
    expect(after).to.deep.eq(before);
  });
});
