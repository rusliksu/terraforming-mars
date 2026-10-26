import type {InputResponse} from '@/common/inputs/InputResponse';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {GameId} from '@/common/Types';

import {isGameShellEnabled} from './GameShellFeatureFlag';
import {HttpGameShellTransport} from './GameShellHttpTransport';
import {GameShellService, gameShell} from './GameShellService';
import {GameShellSubmitService} from './GameShellSubmitService';
import type {
  GameShellRetryPolicy,
  GameShellSubmitIntent,
  GameShellSubmitOutcome,
  GameShellTransport,
} from './GameShellSubmitTypes';

/**
 * Bootstrap values for a v2 submit. A full GET player view does not carry
 * revision, prompt token or engine identity, so the client must not invent
 * them: until the server issues a dedicated bootstrap payload this provider
 * stays unset and WaitingFor.onsave keeps its legacy POST.
 */
export interface GameShellPromptBootstrap {
  gameId: GameId;
  baseRevision: number;
  promptToken: string;
  engineVersion: string;
}

export type GameShellPromptBootstrapProvider =
  (playerView: PlayerViewModel) => GameShellPromptBootstrap | undefined;

export interface GameShellWaitingForBridgeOptions {
  shell: GameShellService;
  transport: GameShellTransport;
  createActionId?: () => string;
  sleep?: (delayMs: number) => Promise<void>;
  policy?: Partial<GameShellRetryPolicy>;
  onOutcome?: (outcome: GameShellSubmitOutcome) => void;
  onError?: (error: unknown) => void;
}

/** actionId is an idempotency key, not a security token. */
export function newGameShellActionId(): string {
  const cryptoApi = typeof window !== 'undefined' ? window.crypto : undefined;
  if (cryptoApi !== undefined && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  const hex = (length: number): string => Math.floor(Math.random() * (16 ** length)).toString(16).padStart(length, '0');
  return hex(8) + '-' + hex(4) + '-4' + hex(3) + '-' + (8 + Math.floor(Math.random() * 4)).toString(16) + hex(3) + '-' + hex(12);
}

/**
 * Adapter between the legacy WaitingFor.onsave call and the v2 submit
 * service. It is intentionally gated twice: by the default-off feature flag
 * and by a server-issued bootstrap. If either is absent, trySubmit returns
 * false and the caller executes the unchanged legacy POST.
 */
export class GameShellWaitingForBridge {
  private readonly shell: GameShellService;
  private readonly transport: GameShellTransport;
  private readonly createActionId: () => string;
  private readonly sleep: ((delayMs: number) => Promise<void>) | undefined;
  private readonly policy: Partial<GameShellRetryPolicy> | undefined;
  private readonly onOutcome: ((outcome: GameShellSubmitOutcome) => void) | undefined;
  private readonly onError: ((error: unknown) => void) | undefined;
  private readonly actionIds = new Map<string, string>();
  private bootstrapProvider: GameShellPromptBootstrapProvider | undefined = undefined;
  private service: GameShellSubmitService | undefined = undefined;
  private serviceGameId: GameId | undefined = undefined;

  public constructor(options: GameShellWaitingForBridgeOptions) {
    this.shell = options.shell;
    this.transport = options.transport;
    this.createActionId = options.createActionId ?? newGameShellActionId;
    this.sleep = options.sleep;
    this.policy = options.policy;
    this.onOutcome = options.onOutcome;
    this.onError = options.onError;
  }

  public setBootstrapProvider(provider: GameShellPromptBootstrapProvider | undefined): void {
    this.bootstrapProvider = provider;
    this.actionIds.clear();
    this.dropService();
  }

  public reset(): void {
    this.dropService();
    this.actionIds.clear();
  }

  /**
   * Returns true when the v2 service accepted the input, so the caller must
   * not send the legacy POST. Missing bootstrap is not a validation failure:
   * it means the server has not issued the token yet and legacy stays active.
   */
  public trySubmit(playerView: PlayerViewModel, input: InputResponse): boolean {
    if (!isGameShellEnabled()) {
      return false;
    }
    let bootstrap: GameShellPromptBootstrap | undefined;
    try {
      bootstrap = this.bootstrapProvider?.(playerView);
    } catch (error) {
      // No validated provider output means no safe v2 submit; keep legacy.
      this.onError?.(error);
      return false;
    }
    if (bootstrap === undefined) {
      return false;
    }
    const service = this.ensureService(bootstrap.gameId);
    const actionId = this.actionIdFor(bootstrap, input);
    const intent: GameShellSubmitIntent = {
      actionId,
      baseRevision: bootstrap.baseRevision,
      promptToken: bootstrap.promptToken,
      engineVersion: bootstrap.engineVersion,
      input,
    };
    try {
      const promise = service.submit(intent);
      void promise.then(
        (outcome) => {
          this.onOutcome?.(outcome);
        },
        (error: unknown) => {
          this.onError?.(error);
        },
      );
    } catch (error) {
      // A provided-but-invalid bootstrap must not silently fall back to v1.
      this.onError?.(error);
    }
    return true;
  }

  private ensureService(gameId: GameId): GameShellSubmitService {
    if (this.service !== undefined && this.serviceGameId === gameId) {
      return this.service;
    }
    this.dropService();
    this.service = new GameShellSubmitService({
      gameId,
      transport: this.transport,
      shell: this.shell,
      policy: this.policy,
      sleep: this.sleep,
    });
    this.serviceGameId = gameId;
    return this.service;
  }

  private dropService(): void {
    this.service?.reset();
    this.service = undefined;
    this.serviceGameId = undefined;
  }

  private actionIdFor(bootstrap: GameShellPromptBootstrap, input: InputResponse): string {
    const key = JSON.stringify({
      gameId: bootstrap.gameId,
      baseRevision: bootstrap.baseRevision,
      promptToken: bootstrap.promptToken,
      engineVersion: bootstrap.engineVersion,
      input,
    });
    const existing = this.actionIds.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const actionId = this.createActionId();
    this.actionIds.set(key, actionId);
    while (this.actionIds.size > 32) {
      const oldest = this.actionIds.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.actionIds.delete(oldest);
    }
    return actionId;
  }
}

export const gameShellWaitingForBridge = new GameShellWaitingForBridge({
  shell: gameShell,
  transport: new HttpGameShellTransport(),
});

let bridgeOverrideForTest: GameShellWaitingForBridge | undefined = undefined;

/** Test seam: routes the module-level component hook through a local bridge. */
export function setGameShellWaitingForBridgeForTest(bridge: GameShellWaitingForBridge | undefined): void {
  bridgeOverrideForTest = bridge;
}

/** Future wiring point once the server issues a v2 prompt bootstrap. */
export function setGameShellPromptBootstrapProvider(provider: GameShellPromptBootstrapProvider | undefined): void {
  gameShellWaitingForBridge.setBootstrapProvider(provider);
}

/** The single hook WaitingFor.onsave calls before its legacy POST. */
export function trySubmitGameShellInput(playerView: PlayerViewModel, input: InputResponse): boolean {
  return (bridgeOverrideForTest ?? gameShellWaitingForBridge).trySubmit(playerView, input);
}
