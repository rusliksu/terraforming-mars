import {expect} from 'chai';
import {
  clampReplayEntries,
  fromRows,
  parseReplayInput,
  REPLAY_JOURNAL_ENTRY_LIMIT,
  POSTGRES_REPLAY_JOURNAL_DDL,
  SQLITE_REPLAY_JOURNAL_DDL,
  ReplayJournalEntry,
  ReplayJournalSnapshot,
  toEntryRows,
  toHeadRow,
} from '@/server/database/ReplayJournal';
import {InputResponse} from '@/common/inputs/InputResponse';

function entry(index: number): ReplayJournalEntry {
  return {
    actorId: 'p' + index,
    promptFingerprint: 'fingerprint-' + index,
    input: {type: 'option', index} as unknown as InputResponse,
  };
}

function snapshot(entries: ReadonlyArray<ReplayJournalEntry>): ReplayJournalSnapshot {
  return {
    gameId: 'game-id',
    rootSaveId: 7,
    currentActorId: 'p1',
    currentPromptFingerprint: 'fingerprint-1',
    resetBeforeNextInput: false,
    entries,
  };
}

describe('ReplayJournal', () => {
  it('keeps the newest entries when the action exceeds the limit', () => {
    const entries = Array.from({length: REPLAY_JOURNAL_ENTRY_LIMIT + 5}, (_unused, index) => entry(index));
    const clamped = clampReplayEntries(entries);
    expect(clamped.length).to.equal(REPLAY_JOURNAL_ENTRY_LIMIT);
    expect(clamped[0].actorId).to.equal('p5');
    expect(clamped[clamped.length - 1].actorId).to.equal('p' + (REPLAY_JOURNAL_ENTRY_LIMIT + 4));
  });

  it('does not copy entries that already fit', () => {
    const entries = [entry(0), entry(1)];
    expect(clampReplayEntries(entries)).to.equal(entries);
  });

  it('numbers entry rows from zero and clamps them', () => {
    const entries = Array.from({length: REPLAY_JOURNAL_ENTRY_LIMIT + 2}, (_unused, index) => entry(index));
    const rows = toEntryRows(snapshot(entries), '2026-11-23T00:00:00.000Z');
    expect(rows.length).to.equal(REPLAY_JOURNAL_ENTRY_LIMIT);
    expect(rows[0].seq).to.equal(0);
    expect(rows[rows.length - 1].seq).to.equal(REPLAY_JOURNAL_ENTRY_LIMIT - 1);
    expect(rows[0].root_save_id).to.equal(7);
    expect(rows[0].created_at).to.equal('2026-11-23T00:00:00.000Z');
  });

  it('round-trips head and entries without losing optional fields', () => {
    const original = snapshot([
      {actorId: 'p1', promptFingerprint: 'f1', input: {type: 'option', index: 0} as unknown as InputResponse, logStartIndex: 12, continuesThroughNextInput: true},
      {actorId: 'p1', promptFingerprint: 'f2', input: {type: 'space'} as unknown as InputResponse},
    ]);
    const headRow = toHeadRow(original, '2026-11-23T00:00:00.000Z');
    const entryRows = toEntryRows(original, '2026-11-23T00:00:00.000Z');
    const restored = fromRows(headRow, entryRows);
    expect(restored).to.be.not.undefined;
    const journal = restored!;
    expect(journal.rootSaveId).to.equal(7);
    expect(journal.currentPromptFingerprint).to.equal('fingerprint-1');
    expect(journal.entries.length).to.equal(2);
    expect(journal.entries[0].logStartIndex).to.equal(12);
    expect(journal.entries[0].continuesThroughNextInput).to.be.true;
    expect(journal.entries[1].logStartIndex).to.be.undefined;
    expect(journal.entries[1].continuesThroughNextInput).to.be.false;
  });

  it('restores entries in sequence order regardless of row order', () => {
    const original = snapshot([entry(0), entry(1), entry(2)]);
    const headRow = toHeadRow(original, 'now');
    const rows = [...toEntryRows(original, 'now')].reverse();
    const restored = fromRows(headRow, rows);
    expect(restored!.entries.map((each) => each.actorId)).to.deep.equal(['p0', 'p1', 'p2']);
  });

  it('drops the journal when a stored input cannot be replayed', () => {
    const original = snapshot([entry(0), entry(1)]);
    const headRow = toHeadRow(original, 'now');
    const rows = toEntryRows(original, 'now');
    const corrupted = [{...rows[0], input_json: '{not json'}, rows[1]];
    expect(fromRows(headRow, corrupted)).to.be.undefined;
  });

  it('parses only object payloads', () => {
    expect(parseReplayInput('{"type":"option"}')).to.deep.equal({type: 'option'});
    expect(parseReplayInput('null')).to.be.undefined;
    expect(parseReplayInput('42')).to.be.undefined;
    expect(parseReplayInput('not json')).to.be.undefined;
  });

  it('declares both journal tables for each backend', () => {
    for (const statement of [...POSTGRES_REPLAY_JOURNAL_DDL, ...SQLITE_REPLAY_JOURNAL_DDL]) {
      expect(statement).to.match(/CREATE TABLE IF NOT EXISTS game_action_replay/);
    }
    expect(POSTGRES_REPLAY_JOURNAL_DDL.join(' ')).to.include('game_action_replay_head');
    expect(SQLITE_REPLAY_JOURNAL_DDL.join(' ')).to.include('game_action_replay_head');
  });
});
