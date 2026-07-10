import * as crypto from 'crypto';
import * as readline from 'readline';

import {Phase} from '../../common/Phase';
import {CardName} from '../../common/cards/CardName';
import {InputResponse} from '../../common/inputs/InputResponse';
import {PlayerId} from '../../common/Types';
import {Game} from '../Game';
import {SerializedGame} from '../SerializedGame';
import {Server} from '../models/ServerModel';

export type TmSimKnowledgeModeV1 = 'fair_live' | 'fair_replay' | 'oracle_teacher';

export interface TmSimBranchInputV1 {
  candidateId: string;
  input: InputResponse;
  beliefSeed?: number | string;
}

export interface ForkBatchV1 {
  kind: 'fork_batch_v1';
  requestId: string;
  stateVersion: string;
  promptFingerprint: string;
  knowledgeMode: TmSimKnowledgeModeV1;
  observerId: string;
  actorId: string;
  snapshot: SerializedGame;
  branches: Array<TmSimBranchInputV1>;
  limits?: {
    maxBranches?: number;
    ttlMs?: number;
  };
}

export interface ContinueBatchV1 {
  kind: 'continue_batch_v1';
  requestId: string;
  stateVersion: string;
  knowledgeMode: TmSimKnowledgeModeV1;
  observerId: string;
  actorId: string;
  branches: Array<TmSimBranchInputV1 & {branchHandle: string; promptFingerprint: string}>;
}

export type TmSimRequestV1 = ForkBatchV1 | ContinueBatchV1;

export interface TmSimBranchResultV1 {
  candidateId: string;
  status: 'ok' | 'error' | 'stale' | 'unsupported';
  branchHandle: string | null;
  successorStateVersion: string | null;
  promptFingerprint: string | null;
  activePlayerId: string | null;
  stableMainActionBoundary: boolean;
  observer: unknown | null;
  warnings: Array<string>;
  error?: string;
}

export interface TmSimBatchResultV1 {
  kind: 'tm_sim_batch_result_v1';
  requestId: string;
  stateVersion: string;
  knowledgeMode: TmSimKnowledgeModeV1;
  branches: Array<TmSimBranchResultV1>;
  warnings: Array<string>;
}

type StoredBranch = {
  snapshot: SerializedGame;
  observerId: string;
  knowledgeMode: TmSimKnowledgeModeV1;
  expiresAt: number;
};

function normalizeStable(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeStable);
  }
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    output[key] = normalizeStable(source[key]);
  }
  return output;
}

export function stableHash(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(normalizeStable(value))).digest('hex').slice(0, 16);
}

export function promptFingerprintFromWaitingFor(waitingFor: unknown): string {
  return `prompt:${stableHash(waitingFor ?? {})}`;
}

export function sanitizeSnapshotForSimulation(snapshot: SerializedGame): SerializedGame {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as SerializedGame;
  for (const player of cloned.players) {
    player.telegramID = undefined;
    player.lastNoticeMessageId = -1;
  }
  return cloned;
}

function beliefSeedToUint32(seed: number | string): number {
  const digest = crypto.createHash('sha256').update(String(seed)).digest();
  return digest.readUInt32LE(0);
}

function createBeliefRandom(seed: number | string): () => number {
  let state = beliefSeedToUint32(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffleWithBeliefSeed<T>(items: Array<T>, seed: number | string): Array<T> {
  const output = items.slice();
  const random = createBeliefRandom(seed);
  for (let index = output.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

export function redeterminizeSnapshotForObserver(
  snapshot: SerializedGame,
  observerId: string,
  beliefSeed: number | string,
): SerializedGame {
  const cloned = sanitizeSnapshotForSimulation(snapshot);
  if (cloned.phase !== Phase.ACTION) {
    throw new Error(`fair redeterminization supports ACTION phase only, got ${cloned.phase}`);
  }
  const observer = cloned.players.find((player) => player.id === observerId);
  if (observer === undefined) {
    throw new Error(`observer ${observerId} not found`);
  }

  const hiddenFields: Array<'cardsInHand' | 'dealtProjectCards' | 'draftedCards' | 'draftHand'> = [
    'cardsInHand',
    'dealtProjectCards',
    'draftedCards',
    'draftHand',
  ];
  const opponents = cloned.players.filter((player) => player.id !== observerId);
  const allocation: Array<{cards: Array<CardName>; count: number}> = [];
  const pool: Array<CardName> = [];
  for (const player of opponents) {
    if (player.dealtCorporationCards.length > 0 || player.dealtPreludeCards.length > 0 || player.dealtCeoCards.length > 0) {
      throw new Error('fair redeterminization does not support hidden opening-card containers in ACTION phase');
    }
    for (const field of hiddenFields) {
      const cards = player[field];
      allocation.push({cards, count: cards.length});
      pool.push(...cards);
    }
  }
  pool.push(...cloned.projectDeck.drawPile);
  // Canonicalize the information-set pool before shuffling. The fair result must
  // not depend on the real hidden allocation or real deck order in the snapshot.
  pool.sort((left, right) => String(left).localeCompare(String(right)));
  const shuffled = shuffleWithBeliefSeed(pool, beliefSeed);
  let offset = 0;
  for (const target of allocation) {
    target.cards.splice(0, target.cards.length, ...shuffled.slice(offset, offset + target.count));
    offset += target.count;
  }
  cloned.projectDeck.drawPile = shuffled.slice(offset);
  const simulationSeed = beliefSeedToUint32(beliefSeed);
  cloned.seed = simulationSeed;
  cloned.currentSeed = simulationSeed;
  return cloned;
}

export function assertSimulationEnvironmentSafe(
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  const forbidden = [
    'POSTGRES_HOST',
    'DATABASE_URL',
    'LOCAL_FS_DB',
    'LOCAL_STORAGE_DB',
    'TM_BOT_TOKEN',
  ].filter((key) => env[key] !== undefined && String(env[key]).trim() !== '');
  if (forbidden.length > 0) {
    throw new Error(`tm-sim-host refuses configured persistence/network environment: ${forbidden.join(',')}`);
  }
}

function deserializeSimulationGame(snapshot: SerializedGame): Game {
  return Game.deserialize(sanitizeSnapshotForSimulation(snapshot), {simulation: true});
}

function isStableMainActionBoundary(game: Game, actorId: string): boolean {
  if (game.phase !== Phase.ACTION) {
    return false;
  }
  let actor;
  try {
    actor = game.getPlayerById(actorId as PlayerId);
  } catch (_error) {
    return false;
  }
  const waitingFor = Server.getPlayerModel(actor).waitingFor;
  if (waitingFor === undefined) {
    return false;
  }
  const text = JSON.stringify(waitingFor).toLowerCase();
  return waitingFor.type === 'or' && text.includes('action');
}

function buildSuccessorVersion(parentStateVersion: string, observer: unknown): string {
  return `${parentStateVersion}:${stableHash(observer)}`;
}

export class TmSimHost {
  private readonly branches = new Map<string, StoredBranch>();

  public constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly defaultTtlMs: number = 60_000,
    private readonly maxStoredBranches: number = 128,
  ) {}

  public handle(request: TmSimRequestV1): TmSimBatchResultV1 {
    this.purgeExpired();
    return request.kind === 'fork_batch_v1' ? this.forkBatch(request) : this.continueBatch(request);
  }

  private forkBatch(request: ForkBatchV1): TmSimBatchResultV1 {
    const maxBranches = Math.max(1, Math.min(64, request.limits?.maxBranches ?? 32));
    const selected = request.branches.slice(0, maxBranches);
    const results = selected.map((branch) => {
      let game: Game;
      try {
        const snapshot = request.knowledgeMode === 'oracle_teacher' ?
          request.snapshot :
          redeterminizeSnapshotForObserver(
            request.snapshot,
            request.observerId,
            branch.beliefSeed ?? `${request.requestId}:${branch.candidateId}`,
          );
        game = deserializeSimulationGame(snapshot);
      } catch (error) {
        return this.errorResult(branch.candidateId, error);
      }
      const current = this.observerModel(game, request.actorId);
      const actualFingerprint = promptFingerprintFromWaitingFor((current as {waitingFor?: unknown}).waitingFor);
      if (actualFingerprint !== request.promptFingerprint) {
        return this.staleResult(branch.candidateId, actualFingerprint);
      }
      return this.processBranch(game, request, branch, request.limits?.ttlMs);
    });
    if (request.branches.length > selected.length) {
      results.push({
        candidateId: '__truncated__',
        status: 'unsupported',
        branchHandle: null,
        successorStateVersion: null,
        promptFingerprint: null,
        activePlayerId: null,
        stableMainActionBoundary: false,
        observer: null,
        warnings: ['branch_limit_exceeded'],
      });
    }
    return this.batchResult(request, results);
  }

  private continueBatch(request: ContinueBatchV1): TmSimBatchResultV1 {
    const results = request.branches.map((branch) => {
      const stored = this.branches.get(branch.branchHandle);
      if (stored === undefined || stored.expiresAt <= this.now()) {
        return this.unsupportedResult(branch.candidateId, 'branch_handle_missing_or_expired');
      }
      if (stored.observerId !== request.observerId) {
        return this.unsupportedResult(branch.candidateId, 'branch_handle_observer_mismatch');
      }
      if (stored.knowledgeMode !== request.knowledgeMode) {
        return this.unsupportedResult(branch.candidateId, 'branch_handle_knowledge_mode_mismatch');
      }
      let game: Game;
      try {
        game = deserializeSimulationGame(stored.snapshot);
      } catch (error) {
        return this.errorResult(branch.candidateId, error);
      }
      const current = this.observerModel(game, request.actorId);
      const actualFingerprint = promptFingerprintFromWaitingFor((current as {waitingFor?: unknown}).waitingFor);
      if (actualFingerprint !== branch.promptFingerprint) {
        return this.staleResult(branch.candidateId, actualFingerprint);
      }
      return this.processBranch(game, request, branch);
    });
    return this.batchResult(request, results);
  }

  private processBranch(
    game: Game,
    request: TmSimRequestV1,
    branch: TmSimBranchInputV1,
    ttlOverride?: number,
  ): TmSimBranchResultV1 {
    try {
      const actor = game.getPlayerById(request.actorId as PlayerId);
      actor.process(branch.input);
      const observer = this.observerModel(game, request.observerId);
      const activePlayerId = game.activePlayer?.id ?? null;
      const nextActorModel = activePlayerId === null ? null : this.observerModel(game, activePlayerId);
      const nextPrompt = nextActorModel === null ? null : (nextActorModel as {waitingFor?: unknown}).waitingFor;
      const nextFingerprint = nextPrompt === undefined || nextPrompt === null ?
        null :
        promptFingerprintFromWaitingFor(nextPrompt);
      const stable = activePlayerId !== null && isStableMainActionBoundary(game, activePlayerId);
      const warnings: Array<string> = [];
      if (!stable) {
        warnings.push('successor_not_stable_main_action_boundary');
      }
      if (game.deferredActions.length > 0) {
        warnings.push('successor_has_deferred_actions');
      }
      let branchHandle: string | null = null;
      if (stable && game.deferredActions.length === 0) {
        branchHandle = this.storeBranch(game, request.observerId, request.knowledgeMode, ttlOverride);
      }
      return {
        candidateId: branch.candidateId,
        status: 'ok',
        branchHandle,
        successorStateVersion: buildSuccessorVersion(request.stateVersion, observer),
        promptFingerprint: nextFingerprint,
        activePlayerId,
        stableMainActionBoundary: stable,
        observer,
        warnings,
      };
    } catch (error) {
      return this.errorResult(branch.candidateId, error);
    }
  }

  private observerModel(game: Game, playerId: string): unknown {
    return Server.getPlayerModel(game.getPlayerById(playerId as PlayerId));
  }

  private storeBranch(
    game: Game,
    observerId: string,
    knowledgeMode: TmSimKnowledgeModeV1,
    ttlOverride?: number,
  ): string {
    this.purgeExpired();
    while (this.branches.size >= this.maxStoredBranches) {
      const oldest = this.branches.keys().next().value as string | undefined;
      if (oldest === undefined) {
        break;
      }
      this.branches.delete(oldest);
    }
    const handle = crypto.randomUUID();
    const ttlMs = Math.max(1_000, Math.min(300_000, ttlOverride ?? this.defaultTtlMs));
    this.branches.set(handle, {
      snapshot: game.serialize(),
      observerId,
      knowledgeMode,
      expiresAt: this.now() + ttlMs,
    });
    return handle;
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [handle, branch] of this.branches.entries()) {
      if (branch.expiresAt <= now) {
        this.branches.delete(handle);
      }
    }
  }

  private batchResult(request: TmSimRequestV1, branches: Array<TmSimBranchResultV1>): TmSimBatchResultV1 {
    return {
      kind: 'tm_sim_batch_result_v1',
      requestId: request.requestId,
      stateVersion: request.stateVersion,
      knowledgeMode: request.knowledgeMode,
      branches,
      warnings: [],
    };
  }

  private errorResult(candidateId: string, error: unknown): TmSimBranchResultV1 {
    return {
      candidateId,
      status: 'error',
      branchHandle: null,
      successorStateVersion: null,
      promptFingerprint: null,
      activePlayerId: null,
      stableMainActionBoundary: false,
      observer: null,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  private staleResult(candidateId: string, actualFingerprint: string): TmSimBranchResultV1 {
    return {
      candidateId,
      status: 'stale',
      branchHandle: null,
      successorStateVersion: null,
      promptFingerprint: actualFingerprint,
      activePlayerId: null,
      stableMainActionBoundary: false,
      observer: null,
      warnings: ['prompt_fingerprint_mismatch'],
    };
  }

  private unsupportedResult(candidateId: string, warning: string): TmSimBranchResultV1 {
    return {
      candidateId,
      status: 'unsupported',
      branchHandle: null,
      successorStateVersion: null,
      promptFingerprint: null,
      activePlayerId: null,
      stableMainActionBoundary: false,
      observer: null,
      warnings: [warning],
    };
  }
}

async function main(): Promise<number> {
  assertSimulationEnvironmentSafe();
  const host = new TmSimHost();
  const lines = readline.createInterface({input: process.stdin, crlfDelay: Infinity});
  for await (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    try {
      const request = JSON.parse(line) as TmSimRequestV1;
      process.stdout.write(`${JSON.stringify(host.handle(request))}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({
        kind: 'tm_sim_error_v1',
        error: error instanceof Error ? error.message : String(error),
      })}\n`);
    }
  }
  return 0;
}

if (require.main === module) {
  main().then((code) => process.exit(code)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  });
}
