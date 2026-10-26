import type {PlayerInputModel} from '../../common/models/PlayerInputModel';
import type {IPlayer} from '../IPlayer';
import type {SerializedGame} from '../SerializedGame';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deterministic JSON-like serialization: object keys are sorted, undefined
 * values are omitted, and non-finite numbers become null.
 *
 * This is intentionally dependency-free so the same function works in Node,
 * a browser worker, and tests.
 */
export function stableStringify(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  switch (typeof value) {
  case 'string':
    return JSON.stringify(value);
  case 'number':
    return Number.isFinite(value) ? JSON.stringify(value === 0 ? 0 : value) : 'null';
  case 'boolean':
    return value ? 'true' : 'false';
  case 'undefined':
  case 'function':
  case 'symbol':
    return 'null';
  case 'bigint':
    return JSON.stringify(value.toString());
  case 'object': {
    if (Array.isArray(value)) {
      return '[' + value.map((entry) => stableStringify(entry)).join(',') + ']';
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const entries: Array<string> = [];
    for (const key of keys) {
      const entry = record[key];
      if (entry === undefined || typeof entry === 'function' || typeof entry === 'symbol') {
        continue;
      }
      entries.push(JSON.stringify(key) + ':' + stableStringify(entry));
    }
    return '{' + entries.join(',') + '}';
  }
  default:
    return 'null';
  }
}

/**
 * Non-cryptographic 64-bit FNV-1a hash rendered as 16 hex characters.
 *
 * The hash is only used for diagnostics, parity checks, and canonical replay
 * comparisons. It is not a security boundary.
 */
export function canonicalHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < text.length; index++) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Rules-state projection of a serialized game.
 *
 * Diagnostics metadata that depends on wall-clock time, filesystem/Telegram
 * state, or process-global timers is removed. The remaining state is what
 * deterministic replay must reproduce.
 */
export function canonicalEngineState(snapshot: SerializedGame): unknown {
  const state = JSON.parse(JSON.stringify(snapshot)) as SerializedGame & {
    players: Array<Record<string, unknown>>;
  };
  delete (state as unknown as Record<string, unknown>).gameLog;
  for (const player of state.players) {
    const record = player as Record<string, unknown>;
    delete record.timer;
    delete record.telegramID;
    delete record.lastNoticeMessageId;
    delete record.lastTurnNoticeKey;
    delete record.lastTurnReminderNoticeKey;
    delete record.user;
  }
  return state;
}

export function engineStateHash(snapshot: SerializedGame): string {
  return canonicalHash(canonicalEngineState(snapshot));
}

export interface EnginePromptSnapshot {
  readonly type: string;
  readonly fingerprint: string;
}

/** Client-shaped prompt. Using `toModel` avoids serializing player/game cycles. */
export function promptViewModel(player: IPlayer): PlayerInputModel | null {
  const waitingFor = player.getWaitingFor();
  if (waitingFor === undefined) {
    return null;
  }
  return waitingFor.toModel(player);
}

export function promptSnapshot(player: IPlayer): EnginePromptSnapshot | null {
  const view = promptViewModel(player);
  if (view === null) {
    return null;
  }
  return {
    type: view.type,
    fingerprint: canonicalHash(view),
  };
}

export function promptFingerprint(player: IPlayer): string | null {
  const view = promptViewModel(player);
  return view === null ? null : canonicalHash(view);
}

/** Typed convenience guard used by replay tests and hosts. */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}
