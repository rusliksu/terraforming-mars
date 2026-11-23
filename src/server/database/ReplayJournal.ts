import {GameId, PlayerId} from '../../common/Types';
import {InputResponse} from '../../common/inputs/InputResponse';

/** Maximum number of steps retained for one game action. Mirrors ActionReplay's in-memory limit. */
export const REPLAY_JOURNAL_ENTRY_LIMIT = 32;

/** One logical step of the experimental one-step undo, stored outside the game save. */
export type ReplayJournalEntry = {
  actorId: PlayerId,
  promptFingerprint: string,
  input: InputResponse,
  /** Index of the first game log entry that belongs to this input. */
  logStartIndex?: number,
  /** Treat an option choice and the immediately following tile placement as one logical step. */
  continuesThroughNextInput?: boolean,
};

/** Row shape of game_action_replay_head, as read from the database. */
export type ReplayJournalHeadRow = {
  game_id: GameId,
  root_save_id: number,
  current_actor_id: PlayerId,
  current_prompt_fingerprint: string,
  reset_before_next_input: boolean,
  last_step_back_log_start_index: number | null,
  updated_at: string,
};

/** Row shape of game_action_replay, as read from the database. */
export type ReplayJournalEntryRow = {
  game_id: GameId,
  seq: number,
  root_save_id: number,
  actor_id: PlayerId,
  prompt_fingerprint: string,
  input_json: string,
  log_start_index: number | null,
  continues_through_next_input: boolean,
  created_at: string,
};

/** The journal of one game, as it is restored from the database. */
export type ReplayJournalSnapshot = {
  gameId: GameId,
  rootSaveId: number,
  currentActorId: PlayerId,
  currentPromptFingerprint: string,
  resetBeforeNextInput: boolean,
  lastStepBackLogStartIndex?: number,
  entries: ReadonlyArray<ReplayJournalEntry>,
};

/** Storage operations for the replay journal. Implemented by each database backend. */
export type ReplayJournalStore = {
  /** Returns undefined when the game has no persisted journal. */
  readReplayJournal(gameId: GameId): Promise<ReplayJournalSnapshot | undefined>,
  /** Replaces the whole journal of the game in one transaction. */
  replaceReplayJournal(snapshot: ReplayJournalSnapshot): Promise<void>,
  clearReplayJournal(gameId: GameId): Promise<void>,
};

/** Keeps the newest entries, so a long action never exceeds the storage limit. */
export function clampReplayEntries(entries: ReadonlyArray<ReplayJournalEntry>): ReadonlyArray<ReplayJournalEntry> {
  return entries.length <= REPLAY_JOURNAL_ENTRY_LIMIT ? entries : entries.slice(entries.length - REPLAY_JOURNAL_ENTRY_LIMIT);
}

/** Parses a stored input, returning undefined when the payload cannot be replayed. */
export function parseReplayInput(inputJson: string): InputResponse | undefined {
  try {
    const parsed: unknown = JSON.parse(inputJson);
    return typeof parsed === 'object' && parsed !== null ? parsed as InputResponse : undefined;
  } catch {
    return undefined;
  }
}

function orUndefined(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

/** Builds the head row for the given journal state. */
export function toHeadRow(snapshot: ReplayJournalSnapshot, updatedAt: string): ReplayJournalHeadRow {
  return {
    game_id: snapshot.gameId,
    root_save_id: snapshot.rootSaveId,
    current_actor_id: snapshot.currentActorId,
    current_prompt_fingerprint: snapshot.currentPromptFingerprint,
    reset_before_next_input: snapshot.resetBeforeNextInput,
    last_step_back_log_start_index: snapshot.lastStepBackLogStartIndex ?? null,
    updated_at: updatedAt,
  };
}

/** Builds entry rows for the given journal state, dropping entries beyond the storage limit. */
export function toEntryRows(snapshot: ReplayJournalSnapshot, createdAt: string): ReadonlyArray<ReplayJournalEntryRow> {
  return clampReplayEntries(snapshot.entries).map((entry, index) => ({
    game_id: snapshot.gameId,
    seq: index,
    root_save_id: snapshot.rootSaveId,
    actor_id: entry.actorId,
    prompt_fingerprint: entry.promptFingerprint,
    input_json: JSON.stringify(entry.input),
    log_start_index: entry.logStartIndex ?? null,
    continues_through_next_input: entry.continuesThroughNextInput === true,
    created_at: createdAt,
  }));
}

/** Restores the journal from head and entry rows, returning undefined when any input cannot be replayed. */
export function fromRows(head: ReplayJournalHeadRow, rows: ReadonlyArray<ReplayJournalEntryRow>): ReplayJournalSnapshot | undefined {
  const entries: Array<ReplayJournalEntry> = [];
  for (const row of [...rows].sort((left, right) => left.seq - right.seq)) {
    const input = parseReplayInput(row.input_json);
    if (input === undefined) {
      return undefined;
    }
    entries.push({
      actorId: row.actor_id,
      promptFingerprint: row.prompt_fingerprint,
      input,
      logStartIndex: orUndefined(row.log_start_index),
      continuesThroughNextInput: row.continues_through_next_input,
    });
  }
  return {
    gameId: head.game_id,
    rootSaveId: head.root_save_id,
    currentActorId: head.current_actor_id,
    currentPromptFingerprint: head.current_prompt_fingerprint,
    resetBeforeNextInput: head.reset_before_next_input,
    lastStepBackLogStartIndex: orUndefined(head.last_step_back_log_start_index),
    entries,
  };
}

/** Schema for the replay journal tables (PostgreSQL). */
export const POSTGRES_REPLAY_JOURNAL_DDL = [
  `CREATE TABLE IF NOT EXISTS game_action_replay_head(
    game_id varchar NOT NULL,
    root_save_id integer NOT NULL,
    current_actor_id varchar NOT NULL,
    current_prompt_fingerprint text NOT NULL,
    reset_before_next_input boolean NOT NULL DEFAULT false,
    last_step_back_log_start_index integer,
    updated_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id));`,
  `CREATE TABLE IF NOT EXISTS game_action_replay(
    game_id varchar NOT NULL,
    seq integer NOT NULL,
    root_save_id integer NOT NULL,
    actor_id varchar NOT NULL,
    prompt_fingerprint text NOT NULL,
    input_json text NOT NULL,
    log_start_index integer,
    continues_through_next_input boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id, seq));`,
];

/** Schema for the replay journal tables (SQLite). */
export const SQLITE_REPLAY_JOURNAL_DDL = [
  `CREATE TABLE IF NOT EXISTS game_action_replay_head(
    game_id varchar NOT NULL,
    root_save_id integer NOT NULL,
    current_actor_id varchar NOT NULL,
    current_prompt_fingerprint text NOT NULL,
    reset_before_next_input integer NOT NULL DEFAULT 0,
    last_step_back_log_start_index integer,
    updated_at timestamp NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (game_id))`,
  `CREATE TABLE IF NOT EXISTS game_action_replay(
    game_id varchar NOT NULL,
    seq integer NOT NULL,
    root_save_id integer NOT NULL,
    actor_id varchar NOT NULL,
    prompt_fingerprint text NOT NULL,
    input_json text NOT NULL,
    log_start_index integer,
    continues_through_next_input integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (game_id, seq))`,
];
