import type {PlayerViewModel} from '@/common/models/PlayerModel';

/** The shell has one lifecycle; it does not model transport or game status. */
export type GameShellStatus = 'stopped' | 'running';

/** A client action intent that has not been settled yet. */
export interface PendingIntent {
  actionId: string;
  baseRevision: number;
}

/**
 * Snapshot exposed to Vue components. confirmedView is always the last
 * server-authorized PlayerViewModel; viewRevision changes once per confirmed
 * view. pendingIntents are outgoing intents that have not been settled yet.
 */
export interface GameShellSnapshot {
  status: GameShellStatus;
  confirmedView: PlayerViewModel | undefined;
  viewRevision: number;
  pendingIntents: ReadonlyArray<PendingIntent>;
}

export type GameShellListener = (snapshot: GameShellSnapshot) => void;
