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
import type {ActionReplayState} from '@/server/game/ActionReplay';
import {
  isReplayJournalEnabled,
  persistActionReplaySnapshot,
  restoreActionReplayState,
  postgresReplaceReplayJournalStatements,
  snapshotFromActionReplayState,
  sqliteReplaceReplayJournalStatements,
} from '@/server/database/ReplayJournal';

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
    rootSnapshot: {id: 'game-id'} as never,
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

  it('builds a journal for an action that has a restorable root', () => {
    const state: ActionReplayState = {
      rootSnapshot: {id: 'game-id'} as unknown as ActionReplayState['rootSnapshot'],
      rootSaveId: 12,
      entries: [
        {actorId: 'p1', promptFingerprint: 'f1', input: {type: 'option'} as unknown as InputResponse, logStartIndex: 3, continuesThroughNextInput: true},
      ],
      currentActorId: 'p1',
      currentPromptFingerprint: 'f2',
      resetBeforeNextInput: false,
      lastStepBackLogStartIndex: 3,
    };
    const journal = snapshotFromActionReplayState('game-id' as never, state);
    expect(journal).to.not.be.undefined;
    expect(journal!.rootSaveId).to.equal(12);
    expect(journal!.entries.length).to.equal(1);
    expect(journal!.entries[0].continuesThroughNextInput).to.be.true;
  });

  it('skips persistence when the action has no root save or no entries', () => {
    const base: ActionReplayState = {
      rootSnapshot: {id: 'game-id'} as unknown as ActionReplayState['rootSnapshot'],
      entries: [{actorId: 'p1', promptFingerprint: 'f1', input: {type: 'option'} as unknown as InputResponse}],
      currentActorId: 'p1',
      currentPromptFingerprint: 'f1',
      resetBeforeNextInput: false,
    };
    expect(snapshotFromActionReplayState('game-id' as never, base)).to.be.undefined;
    expect(snapshotFromActionReplayState('game-id' as never, {...base, rootSaveId: 4, entries: []})).to.be.undefined;
  });

  it('honors the disable switch', () => {
    expect(isReplayJournalEnabled({})).to.be.true;
    expect(isReplayJournalEnabled({TM_DISABLE_REPLAY_JOURNAL: '1'})).to.be.false;
  });

  it('builds backend-specific insert statements with matching placeholders', () => {
    const journal = snapshot([entry(0)]);
    const postgres = postgresReplaceReplayJournalStatements(journal, 'now');
    const sqlite = sqliteReplaceReplayJournalStatements(journal, 'now');
    expect(postgres.headSql).to.include('$1');
    expect(sqlite.headSql).to.include('?');
    expect(postgres.headValues.length).to.equal(8);
    expect(sqlite.headValues.length).to.equal(8);
    expect(postgres.entryValues.length).to.equal(9);
    expect(sqlite.entryValues.length).to.equal(9);
    expect(sqlite.entryValues[7]).to.equal(0);
  });

  it('restores the journal when the root save and prompt still match', () => {
    const journal = snapshot([entry(0)]);
    const result = restoreActionReplayState(journal, 'fingerprint-1');
    expect(result.kind).to.equal('restored');
    if (result.kind === 'restored') {
      expect(result.state.rootSaveId).to.equal(7);
      expect(result.state.entries.length).to.equal(1);
      expect(result.state.entries[0].actorId).to.equal('p0');
    }
  });

  it('drops the journal when the root save is gone', () => {
    const legacy: ReplayJournalSnapshot = {...snapshot([entry(0)]), rootSnapshot: undefined as never};
    const result = restoreActionReplayState(legacy, 'fingerprint-1');
    expect(result).to.deep.equal({kind: 'dropped', reason: 'missing_root'});
  });

  it('drops the journal when the prompt has moved on', () => {
    const result = restoreActionReplayState(snapshot([entry(0)]), 'other-fingerprint');
    expect(result).to.deep.equal({kind: 'dropped', reason: 'fingerprint'});
  });

  it('persists the accepted step through the store', async () => {
    const written: Array<ReplayJournalSnapshot> = [];
    const store = {writeReplayJournal: async (snapshot: ReplayJournalSnapshot) => {
      written.push(snapshot);
    }};
    const state: ActionReplayState = {
      rootSnapshot: {id: 'game-id'} as never,
      rootSaveId: 3,
      entries: [{actorId: 'p1', promptFingerprint: 'f1', input: {type: 'option'} as unknown as InputResponse}],
      currentActorId: 'p1',
      currentPromptFingerprint: 'f1',
      resetBeforeNextInput: false,
    };
    expect(await persistActionReplaySnapshot(store, 'game-id' as never, state)).to.be.true;
    expect(written.length).to.equal(1);
    expect(written[0].entries.length).to.equal(1);
    expect(written[0].rootSaveId).to.equal(3);
  });

  it('skips the store when there is no state or no steps', async () => {
    const written: Array<ReplayJournalSnapshot> = [];
    const store = {writeReplayJournal: async (snapshot: ReplayJournalSnapshot) => {
      written.push(snapshot);
    }};
    expect(await persistActionReplaySnapshot(store, 'game-id' as never, undefined)).to.be.false;
    expect(await persistActionReplaySnapshot(store, 'game-id' as never, null)).to.be.false;
    const emptyState: ActionReplayState = {rootSnapshot: {id: 'x'} as never, rootSaveId: 1, entries: [], currentActorId: 'p1', currentPromptFingerprint: 'f', resetBeforeNextInput: false};
    expect(await persistActionReplaySnapshot(store, 'game-id' as never, emptyState)).to.be.false;
    expect(written.length).to.equal(0);
  });
});
