import {GameId, PlayerId} from '../../common/Types';
import {InputResponse} from '../../common/inputs/InputResponse';
import type {ActionReplayState} from '../game/ActionReplay';
import {SerializedGame} from '../SerializedGame';

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

/** Journal persistence is on by default; the environment switch disables it without a schema change. */
export function isReplayJournalEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.TM_DISABLE_REPLAY_JOURNAL !== '1';
}

/**
 * Builds the persistable journal for the current action, or undefined when the action has no
 * restorable root or nothing worth restoring yet.
 */
export function snapshotFromActionReplayState(gameId: GameId, state: ActionReplayState): ReplayJournalSnapshot | undefined {
  if (state.rootSaveId === undefined || state.entries.length === 0) {
    return undefined;
  }
  return {
    gameId,
    rootSaveId: state.rootSaveId,
    currentActorId: state.currentActorId,
    currentPromptFingerprint: state.currentPromptFingerprint,
    resetBeforeNextInput: state.resetBeforeNextInput,
    lastStepBackLogStartIndex: state.lastStepBackLogStartIndex,
    entries: state.entries.map((entry) => ({
      actorId: entry.actorId,
      promptFingerprint: entry.promptFingerprint,
      input: entry.input,
      logStartIndex: entry.logStartIndex,
      continuesThroughNextInput: entry.continuesThroughNextInput,
    })),
  };
}

/** Statements that delete and insert one journal inside an open transaction (PostgreSQL). */
export function postgresReplaceReplayJournalStatements(snapshot: ReplayJournalSnapshot, now: string): {
  headSql: string, headValues: ReadonlyArray<unknown>,
  entrySql: string, entryValues: ReadonlyArray<ReadonlyArray<unknown>>,
} {
  const head = toHeadRow(snapshot, now);
  const rows = toEntryRows(snapshot, now);
  return {
    headSql: `INSERT INTO game_action_replay_head(game_id, root_save_id, current_actor_id, current_prompt_fingerprint, reset_before_next_input, last_step_back_log_start_index, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    headValues: [head.game_id, head.root_save_id, head.current_actor_id, head.current_prompt_fingerprint, head.reset_before_next_input, head.last_step_back_log_start_index, head.updated_at],
    entrySql: `INSERT INTO game_action_replay(game_id, seq, root_save_id, actor_id, prompt_fingerprint, input_json, log_start_index, continues_through_next_input, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    entryValues: rows.map((row) => [row.game_id, row.seq, row.root_save_id, row.actor_id, row.prompt_fingerprint, row.input_json, row.log_start_index, row.continues_through_next_input, row.created_at]),
  };
}

/** Statements that delete and insert one journal inside an open transaction (SQLite). */
export function sqliteReplaceReplayJournalStatements(snapshot: ReplayJournalSnapshot, now: string): {
  headSql: string, headValues: ReadonlyArray<unknown>,
  entrySql: string, entryValues: ReadonlyArray<ReadonlyArray<unknown>>,
} {
  const head = toHeadRow(snapshot, now);
  const rows = toEntryRows(snapshot, now);
  return {
    headSql: `INSERT INTO game_action_replay_head(game_id, root_save_id, current_actor_id, current_prompt_fingerprint, reset_before_next_input, last_step_back_log_start_index, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    headValues: [head.game_id, head.root_save_id, head.current_actor_id, head.current_prompt_fingerprint, head.reset_before_next_input ? 1 : 0, head.last_step_back_log_start_index, head.updated_at],
    entrySql: `INSERT INTO game_action_replay(game_id, seq, root_save_id, actor_id, prompt_fingerprint, input_json, log_start_index, continues_through_next_input, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entryValues: rows.map((row) => [row.game_id, row.seq, row.root_save_id, row.actor_id, row.prompt_fingerprint, row.input_json, row.log_start_index, row.continues_through_next_input ? 1 : 0, row.created_at]),
  };
}

/** Why a persisted journal could not be attached to a loaded game. */
export type ReplayRestoreFailure = 'missing_root' | 'fingerprint' | 'corrupt';

/** Result of attaching a persisted journal to a freshly loaded game. */
export type ReplayRestoreResult =
  | {kind: 'restored', state: ActionReplayState}
  | {kind: 'dropped', reason: ReplayRestoreFailure};

/**
 * Attaches a persisted journal to a loaded game.
 *
 * The journal is only usable when the root save still exists and the game's current prompt
 * matches the recorded one; anything else drops the journal and leaves the game untouched.
 */
export function restoreActionReplayState(
  journal: ReplayJournalSnapshot,
  rootSnapshot: SerializedGame | undefined,
  currentPromptFingerprint: string,
): ReplayRestoreResult {
  if (rootSnapshot === undefined) {
    return {kind: 'dropped', reason: 'missing_root'};
  }
  if (journal.currentPromptFingerprint !== currentPromptFingerprint) {
    return {kind: 'dropped', reason: 'fingerprint'};
  }
  return {
    kind: 'restored',
    state: {
      rootSnapshot,
      rootSaveId: journal.rootSaveId,
      entries: journal.entries.map((entry) => ({
        actorId: entry.actorId,
        promptFingerprint: entry.promptFingerprint,
        input: entry.input,
        logStartIndex: entry.logStartIndex,
        continuesThroughNextInput: entry.continuesThroughNextInput,
      })),
      currentActorId: journal.currentActorId,
      currentPromptFingerprint: journal.currentPromptFingerprint,
      resetBeforeNextInput: journal.resetBeforeNextInput,
      lastStepBackLogStartIndex: journal.lastStepBackLogStartIndex,
    },
  };
}
