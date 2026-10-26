import type {ActionBootstrapResponseV1, ActionErrorResponseV1} from '@/common/actionProtocol/ActionProtocol';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import {isPlayerId} from '@/common/Types';
import type {GameId, PlayerId} from '@/common/Types';

import {HttpGameShellTransport} from './GameShellHttpTransport';
import type {GameShellPromptBootstrap} from './GameShellWaitingForBridge';
import type {GameShellSubmitOutcome} from './GameShellSubmitTypes';

export interface GameShellBootstrapTransport {
  fetchBootstrap(playerId: PlayerId): Promise<ActionBootstrapResponseV1 | ActionErrorResponseV1 | undefined>;
}

type CachedBootstrap = {
  playerId: PlayerId;
  gameId: string;
  baseRevision: number;
  promptToken: string;
  engineVersion: string;
};

/**
 * The server owns prompt tokens. This cache exists only because WaitingFor's
 * onsave hook is synchronous: main.ts primes it at startup, and submit outcomes
 * refresh it after the prompt token rotates.
 */
export class GameShellBootstrapCache {
  private cached: CachedBootstrap | undefined;
  private inFlight: Promise<void> | undefined;
  private readonly transport: GameShellBootstrapTransport;

  public constructor(transport: GameShellBootstrapTransport = new HttpGameShellTransport()) {
    this.transport = transport;
  }

  public get(playerView: PlayerViewModel): GameShellPromptBootstrap | undefined {
    const cached = this.cached;
    if (cached === undefined ||
        cached.playerId !== playerView.id ||
        cached.gameId !== playerView.game.gameId) {
      return undefined;
    }
    return {
      gameId: cached.gameId as GameId,
      baseRevision: cached.baseRevision,
      promptToken: cached.promptToken,
      engineVersion: cached.engineVersion,
    };
  }

  /** Called from main.ts when the player URL is already present. */
  public async primeFromLocation(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    const playerId = new URLSearchParams(window.location.search).get('id');
    if (playerId === null || !isPlayerId(playerId)) {
      return;
    }
    await this.refreshById(playerId);
  }

  /** Refresh on a full authorized view/resync. */
  public async refresh(playerView: PlayerViewModel): Promise<void> {
    await this.refreshById(playerView.id);
  }

  /** Keep the next submit bound to the server-issued prompt token. */
  public applyOutcome(outcome: GameShellSubmitOutcome): void {
    if (outcome.status !== 'applied' && outcome.status !== 'duplicate') {
      return;
    }
    const cached = this.cached;
    if (cached === undefined ||
        cached.playerId !== outcome.view.id ||
        cached.gameId !== outcome.view.game.gameId ||
        outcome.promptToken === undefined) {
      return;
    }
    this.cached = {...cached, baseRevision: outcome.revision, promptToken: outcome.promptToken};
  }

  private async refreshById(playerId: PlayerId): Promise<void> {
    if (this.inFlight !== undefined) {
      await this.inFlight;
      return;
    }
    this.inFlight = this.load(playerId).finally(() => {
      this.inFlight = undefined;
    });
    await this.inFlight;
  }

  private async load(playerId: PlayerId): Promise<void> {
    let response: ActionBootstrapResponseV1 | ActionErrorResponseV1 | undefined;
    try {
      response = await this.transport.fetchBootstrap(playerId);
    } catch (_err) {
      this.cached = undefined;
      return;
    }
    if (response === undefined ||
        response.status !== 'ready' ||
        response.playerId !== playerId ||
        response.promptToken === undefined) {
      this.cached = undefined;
      return;
    }
    this.cached = {
      playerId,
      gameId: response.gameId,
      baseRevision: response.baseRevision,
      promptToken: response.promptToken,
      engineVersion: response.engineVersion,
    };
  }
}

let activeBootstrapCache: GameShellBootstrapCache | undefined;

export function installGameShellBootstrapProvider(
  bridge: {setBootstrapProvider: (provider: ((view: PlayerViewModel) => GameShellPromptBootstrap | undefined) | undefined) => void; setOutcomeListener?: (listener: ((outcome: GameShellSubmitOutcome) => void) | undefined) => void},
  transport: GameShellBootstrapTransport = new HttpGameShellTransport(),
): GameShellBootstrapCache {
  const cache = new GameShellBootstrapCache(transport);
  activeBootstrapCache = cache;
  bridge.setBootstrapProvider((view) => cache.get(view));
  bridge.setOutcomeListener?.((outcome) => cache.applyOutcome(outcome));
  return cache;
}

/** Refresh after a full authorized view or resync. */
export async function refreshGameShellBootstrap(playerView: PlayerViewModel): Promise<void> {
  await activeBootstrapCache?.refresh(playerView);
}
