import type {PlayerViewModel} from '@/common/models/PlayerModel';

import type {
  GameShellListener,
  GameShellSnapshot,
  GameShellStatus,
  PendingIntent,
} from './GameShellTypes';
import type {GameShellWorkerMessage, GameShellWorkerPort} from './GameShellWorkerPort';

export {BROWSER_ENGINE_V2_FLAG, isBrowserEngineV2Enabled} from './GameShellFeatureFlag';
export type {FlagStorage} from './GameShellFeatureFlag';
export type {GameShellSnapshot, PendingIntent} from './GameShellTypes';

/**
 * Root-level owner of the confirmed game view.
 *
 * The first increment is deliberately small:
 * - it stores only a server-authorized PlayerViewModel;
 * - intents are queued and forwarded, never folded into the confirmed view
 *   (no prediction/optimistic state);
 * - the singleton survives PlayerHome/WaitingFor remounts;
 * - everything stays in memory: no localStorage, IndexedDB, BroadcastChannel
 *   or cookies are used for the view or cards.
 */
export class GameShellService {
  private status: GameShellStatus = 'stopped';
  private confirmedView: PlayerViewModel | undefined = undefined;
  private viewRevision = 0;
  private readonly pending = new Map<string, PendingIntent>();
  private readonly listeners = new Set<GameShellListener>();
  private workerPort: GameShellWorkerPort | undefined = undefined;
  private unsubscribeWorker: (() => void) | undefined = undefined;

  public getStatus(): GameShellStatus {
    return this.status;
  }

  public isRunning(): boolean {
    return this.status === 'running';
  }

  /**
   * Starts the lifecycle. Idempotent while running. An optional Worker port
   * is attached/replaced for the future Worker adapter.
   */
  public start(workerPort?: GameShellWorkerPort): void {
    const wasRunning = this.status === 'running';
    this.status = 'running';
    let changed = !wasRunning;
    if (workerPort !== undefined && workerPort !== this.workerPort) {
      this.detachWorker();
      this.workerPort = workerPort;
      this.unsubscribeWorker = workerPort.subscribe((message) => this.handleWorkerMessage(message));
      workerPort.start();
      changed = true;
    }
    if (changed) {
      this.emit();
    }
  }

  /**
   * Stops the lifecycle, detaches the Worker port and drops pending intents.
   * The last confirmed view is retained (memory-only) so a remount can still
   * render the authorized snapshot without prediction.
   */
  public stop(): void {
    if (this.status === 'stopped' && this.workerPort === undefined) {
      return;
    }
    this.detachWorker();
    this.pending.clear();
    this.status = 'stopped';
    this.emit();
  }

  /**
   * Applies a server-confirmed, authorized view. This is the only writer of
   * confirmedView and viewRevision. When revision is omitted the local
   * revision advances by one.
   */
  public setConfirmedView(view: PlayerViewModel, revision?: number): void {
    const nextRevision = revision === undefined ? this.viewRevision + 1 : revision;
    if (!Number.isSafeInteger(nextRevision) || nextRevision < 0 || nextRevision < this.viewRevision) {
      throw new Error('viewRevision must be a monotonic non-negative integer');
    }
    this.confirmedView = view;
    this.viewRevision = nextRevision;
    this.emit();
  }

  /** Explicit alias for callers that prefer the confirmed-view vocabulary. */
  public confirmView(view: PlayerViewModel, revision?: number): void {
    this.setConfirmedView(view, revision);
  }

  public getConfirmedView(): PlayerViewModel | undefined {
    return this.confirmedView;
  }

  public getViewRevision(): number {
    return this.viewRevision;
  }

  public addPendingIntent(intent: PendingIntent): void {
    if (this.pending.has(intent.actionId)) {
      return;
    }
    this.pending.set(intent.actionId, {...intent});
    this.workerPort?.send({...intent});
    this.emit();
  }

  public removePendingIntent(actionId: string): void {
    if (this.pending.delete(actionId)) {
      this.emit();
    }
  }

  public getPendingIntents(): ReadonlyArray<PendingIntent> {
    return Array.from(this.pending.values(), (intent) => ({...intent}));
  }

  public clearPendingIntents(): void {
    if (this.pending.size === 0) {
      return;
    }
    this.pending.clear();
    this.emit();
  }

  /** Used on logout or a full authorized resync with a different player. */
  public reset(): void {
    this.confirmedView = undefined;
    this.viewRevision = 0;
    this.pending.clear();
    this.emit();
  }

  public subscribe(listener: GameShellListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public snapshot(): GameShellSnapshot {
    return {
      status: this.status,
      confirmedView: this.confirmedView,
      viewRevision: this.viewRevision,
      pendingIntents: this.getPendingIntents(),
    };
  }

  public getSnapshot(): GameShellSnapshot {
    return this.snapshot();
  }

  private handleWorkerMessage(message: GameShellWorkerMessage): void {
    switch (message.type) {
    case 'confirmed-view':
      if (message.viewRevision !== undefined && message.viewRevision < this.viewRevision) {
        return;
      }
      if (message.actionId !== undefined) {
        this.pending.delete(message.actionId);
      }
      this.setConfirmedView(message.playerView, message.viewRevision);
      break;
    case 'intent-rejected':
      this.removePendingIntent(message.actionId);
      break;
    }
  }

  private detachWorker(): void {
    this.unsubscribeWorker?.();
    this.unsubscribeWorker = undefined;
    if (this.workerPort !== undefined) {
      this.workerPort.stop();
      this.workerPort = undefined;
    }
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of Array.from(this.listeners)) {
      listener(snapshot);
    }
  }
}

/** One instance for the browser root, independent of component remounts. */
export const gameShell = new GameShellService();
