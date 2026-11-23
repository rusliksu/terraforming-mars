import {GameId, PlayerId} from '../../common/Types';
import {InputResponse} from '../../common/inputs/InputResponse';
import {SerializedGame} from '../SerializedGame';
import type {ActionReplayState} from '../game/ActionReplay';

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
  root_json?: string | null,
  current_actor_id: PlayerId,
  current_prompt_fingerprint: string,
  reset_before_next_input: boolean | number,
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
  continues_through_next_input: boolean | number,
  created_at: string,
};

/** The journal of one game, as it is restored from the database. */
export type ReplayJournalSnapshot = {
  gameId: GameId,
  rootSaveId: number,
  /** Pre-action state, stored so a restored journal replays exactly what the live action replayed. */
  rootSnapshot: SerializedGame,
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
  writeReplayJournal(snapshot: ReplayJournalSnapshot): Promise<void>,
  clearReplayJournal(gameId: GameId): Promise<void>,
};

/** Journal persistence is on by default; the environment switch disables it without a schema change. */
export function isReplayJournalEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.TM_DISABLE_REPLAY_JOURNAL !== '1';
}

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

function asBoolean(value: boolean | number): boolean {
  return value === true || value === 1;
}

/** Builds the head row for the given journal state. */
export function toHeadRow(snapshot: ReplayJournalSnapshot, updatedAt: string): ReplayJournalHeadRow {
  return {
    game_id: snapshot.gameId,
    root_save_id: snapshot.rootSaveId,
    root_json: JSON.stringify(snapshot.rootSnapshot),
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

function parseRootSnapshot(rootJson: string | null | undefined): SerializedGame | undefined {
  if (rootJson === null || rootJson === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(rootJson);
    return typeof parsed === 'object' && parsed !== null ? parsed as SerializedGame : undefined;
  } catch {
    return undefined;
  }
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
      continuesThroughNextInput: asBoolean(row.continues_through_next_input),
    });
  }
  const rootSnapshot = parseRootSnapshot(head.root_json);
  if (rootSnapshot === undefined) {
    return undefined;
  }
  return {
    gameId: head.game_id,
    rootSaveId: head.root_save_id,
    rootSnapshot,
    currentActorId: head.current_actor_id,
    currentPromptFingerprint: head.current_prompt_fingerprint,
    resetBeforeNextInput: asBoolean(head.reset_before_next_input),
    lastStepBackLogStartIndex: orUndefined(head.last_step_back_log_start_index),
    entries,
  };
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
    rootSnapshot: state.rootSnapshot,
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

/**
 * Persists the accepted step of the current action, returning whether anything was written.
 *
 * The move's own save runs before the step exists, so the handler calls this right after the step
 * is recorded. A game without a restorable root or without steps writes nothing.
 */
export async function persistActionReplaySnapshot(
  store: Pick<ReplayJournalStore, 'writeReplayJournal'>,
  gameId: GameId,
  state: ActionReplayState | null | undefined,
): Promise<boolean> {
  if (state === undefined || state === null) {
    return false;
  }
  const snapshot = snapshotFromActionReplayState(gameId, state);
  if (snapshot === undefined) {
    return false;
  }
  await store.writeReplayJournal(snapshot);
  return true;
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
  currentPromptFingerprint: string,
): ReplayRestoreResult {
  if (journal.rootSnapshot === undefined) {
    return {kind: 'dropped', reason: 'missing_root'};
  }
  if (journal.currentPromptFingerprint !== currentPromptFingerprint) {
    return {kind: 'dropped', reason: 'fingerprint'};
  }
  return {
    kind: 'restored',
    state: {
      rootSnapshot: journal.rootSnapshot,
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

const ENTRY_COLUMNS = 'game_id, seq, root_save_id, actor_id, prompt_fingerprint, input_json, log_start_index, continues_through_next_input, created_at';

function entryValues(row: ReplayJournalEntryRow, booleansAsIntegers: boolean): ReadonlyArray<unknown> {
  return [
    row.game_id, row.seq, row.root_save_id, row.actor_id, row.prompt_fingerprint, row.input_json,
    row.log_start_index,
    booleansAsIntegers ? (row.continues_through_next_input ? 1 : 0) : row.continues_through_next_input,
    row.created_at,
  ];
}

/** Statements that replace one journal inside an open transaction (PostgreSQL). */
export function postgresReplaceReplayJournalStatements(snapshot: ReplayJournalSnapshot, now: string): {
  headSql: string, headValues: ReadonlyArray<unknown>,
  entrySql: string, entryValues: ReadonlyArray<unknown>,
} {
  const head = toHeadRow(snapshot, now);
  const rows = toEntryRows(snapshot, now);
  const placeholders = rows.map((_row, index) => {
    const base = index * 9;
    return '(' + Array.from({length: 9}, (_unused, offset) => '$' + String(base + offset + 1)).join(', ') + ')';
  }).join(', ');
  return {
    headSql: `INSERT INTO game_action_replay_head(game_id, root_save_id, root_json, current_actor_id, current_prompt_fingerprint, reset_before_next_input, last_step_back_log_start_index, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (game_id) DO UPDATE SET root_save_id = $2, root_json = $3, current_actor_id = $4,
        current_prompt_fingerprint = $5, reset_before_next_input = $6, last_step_back_log_start_index = $7, updated_at = $8`,
    headValues: [head.game_id, head.root_save_id, head.root_json ?? null, head.current_actor_id, head.current_prompt_fingerprint, head.reset_before_next_input, head.last_step_back_log_start_index, head.updated_at],
    entrySql: rows.length === 0 ? '' : `INSERT INTO game_action_replay(${ENTRY_COLUMNS}) VALUES ${placeholders}
      ON CONFLICT (game_id, seq) DO UPDATE SET root_save_id = excluded.root_save_id, actor_id = excluded.actor_id,
        prompt_fingerprint = excluded.prompt_fingerprint, input_json = excluded.input_json, log_start_index = excluded.log_start_index,
        continues_through_next_input = excluded.continues_through_next_input, created_at = excluded.created_at`,
    entryValues: rows.flatMap((row) => entryValues(row, false)),
  };
}

/** Statements that replace one journal inside an open transaction (SQLite). */
export function sqliteReplaceReplayJournalStatements(snapshot: ReplayJournalSnapshot, now: string): {
  headSql: string, headValues: ReadonlyArray<unknown>,
  entrySql: string, entryValues: ReadonlyArray<unknown>,
} {
  const head = toHeadRow(snapshot, now);
  const rows = toEntryRows(snapshot, now);
  const placeholders = rows.map(() => '(' + Array.from({length: 9}, () => '?').join(', ') + ')').join(', ');
  return {
    headSql: `INSERT INTO game_action_replay_head(game_id, root_save_id, root_json, current_actor_id, current_prompt_fingerprint, reset_before_next_input, last_step_back_log_start_index, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (game_id) DO UPDATE SET root_save_id = excluded.root_save_id, root_json = excluded.root_json,
        current_actor_id = excluded.current_actor_id,
        current_prompt_fingerprint = excluded.current_prompt_fingerprint, reset_before_next_input = excluded.reset_before_next_input,
        last_step_back_log_start_index = excluded.last_step_back_log_start_index, updated_at = excluded.updated_at`,
    headValues: [head.game_id, head.root_save_id, head.root_json ?? null, head.current_actor_id, head.current_prompt_fingerprint, head.reset_before_next_input ? 1 : 0, head.last_step_back_log_start_index, head.updated_at],
    entrySql: rows.length === 0 ? '' : `INSERT INTO game_action_replay(${ENTRY_COLUMNS}) VALUES ${placeholders}
      ON CONFLICT (game_id, seq) DO UPDATE SET root_save_id = excluded.root_save_id, actor_id = excluded.actor_id,
        prompt_fingerprint = excluded.prompt_fingerprint, input_json = excluded.input_json, log_start_index = excluded.log_start_index,
        continues_through_next_input = excluded.continues_through_next_input, created_at = excluded.created_at`,
    entryValues: rows.flatMap((row) => entryValues(row, true)),
  };
}

/** Adds the root snapshot column to databases created before it existed. */
export const POSTGRES_REPLAY_JOURNAL_MIGRATIONS = ['ALTER TABLE game_action_replay_head ADD COLUMN IF NOT EXISTS root_json text;'];

/** Schema for the replay journal tables (PostgreSQL). */
export const POSTGRES_REPLAY_JOURNAL_DDL = [
  `CREATE TABLE IF NOT EXISTS game_action_replay_head(
    game_id varchar NOT NULL,
    root_save_id integer NOT NULL,
    root_json text,
    root_json text,
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

/** Adds the root snapshot column to databases created before it existed. */
export const SQLITE_REPLAY_JOURNAL_MIGRATIONS = ['ALTER TABLE game_action_replay_head ADD COLUMN root_json text'];

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
