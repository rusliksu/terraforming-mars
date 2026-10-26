import type {PlayerViewModel} from '@/common/models/PlayerModel';

export const BROWSER_ENGINE_V2_FLAG = 'tm.browserEngineV2';

export interface FlagStorage {
  getItem(key: string): string | null;
}

export function isBrowserEngineV2Enabled(storage?: FlagStorage): boolean {
  const resolved = storage ??
    (typeof localStorage === 'undefined' ? undefined : localStorage);
  return resolved?.getItem(BROWSER_ENGINE_V2_FLAG) === '1';
}

export interface PendingIntent {
  actionId: string;
  baseRevision: number;
}

export interface GameShellSnapshot {
  confirmedView: PlayerViewModel | undefined;
  viewRevision: number;
  pendingIntents: ReadonlyArray<PendingIntent>;
}

type Listener = (snapshot: GameShellSnapshot) => void;

/**
 * Root-level confirmed state. Components may remount, but this service is
 * created once for the lifetime of the browser app. It deliberately does not
 * persist the authorized player view: that can contain private cards.
 */
export class GameShellService {
  private confirmedView: PlayerViewModel | undefined;
  private viewRevision = 0;
  private readonly pending = new Map<string, PendingIntent>();
  private readonly listeners = new Set<Listener>();

  public setConfirmedView(view: PlayerViewModel, revision = 0): void {
    if (!Number.isSafeInteger(revision) || revision < 0 || revision < this.viewRevision) {
      throw new Error('viewRevision must be a monotonic non-negative integer');
    }
    this.confirmedView = view;
    this.viewRevision = revision;
    this.emit();
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

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public snapshot(): GameShellSnapshot {
    return {
      confirmedView: this.confirmedView,
      viewRevision: this.viewRevision,
      pendingIntents: this.getPendingIntents(),
    };
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
