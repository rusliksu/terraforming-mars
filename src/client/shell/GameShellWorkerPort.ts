import type {PlayerViewModel} from '@/common/models/PlayerModel';

import type {PendingIntent} from './GameShellTypes';

export interface ConfirmedViewMessage {
  type: 'confirmed-view';
  playerView: PlayerViewModel;
  /** Server revision. When omitted the shell advances its local revision. */
  viewRevision?: number;
  /** Settles the pending intent that produced this view. */
  actionId?: string;
}

export interface IntentRejectedMessage {
  type: 'intent-rejected';
  actionId: string;
  reason: string;
}

export type GameShellWorkerMessage = ConfirmedViewMessage | IntentRejectedMessage;

/**
 * Typed boundary for the future Web Worker. C1 does not start a Worker: the
 * legacy HTTP fetch in App.vue feeds confirmed views through
 * GameShellService.setConfirmedView, and tests provide a mock port.
 */
export interface GameShellWorkerPort {
  start(): void;
  stop(): void;
  send(intent: Readonly<PendingIntent>): void;
  subscribe(listener: (message: GameShellWorkerMessage) => void): () => void;
}
