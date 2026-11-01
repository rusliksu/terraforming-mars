import {expect} from 'chai';
import crypto from 'crypto';

import {ACTION_SCHEMA_VERSION, ActionBootstrapResponseV1, ActionSuccessResponseV1} from '../../src/common/actionProtocol/ActionProtocol';
import {GameId, PlayerId} from '../../src/common/Types';
import {
  ActionIntent,
  ActionStream,
  AppendActionIntentRequest,
  AppendActionIntentResult,
  FenceActionStreamRequest,
  GenesisSnapshotRecord,
  IActionStore,
  InMemoryActionStore,
  ListActionIntentsOptions,
  OpenActionStreamRequest,
  OpenActionStreamResult,
  PutGenesisSnapshotRequest,
} from '../../src/server/actionStore';
import {ACTION_GATEWAY_ENGINE_VERSION, ActionGateway, EngineFacadeCandidatePort} from '../../src/server/actionGateway';
import {ActionRecovery, ActionRecoveryError} from '../../src/server/actionRecovery';
import {getBehaviorExecutor} from '../../src/server/behavior/BehaviorExecutor';
import {EngineConfig, EngineFacade, EngineHandle, createDeterministicEngineDependencies} from '../../src/server/engine/worker';
import {globalInitialize} from '../../src/server/globalInitialize';
import {IGame} from '../../src/server/IGame';
import {firstInput} from '../actionGateway/InitialCardsTestHelper';

const FIXED_NOW_MS = 1_700_000_000_000;
const SECRET = 'a5b-recovery-spec-secret';
const BLUE_USER = 'discord-a5b-blue';
const RED_USER = 'discord-a5b-red';

function ensureGlobalInitialized(): void {
  try {
    getBehaviorExecutor();
  } catch (_error) {
    globalInitialize();
  }
}

function config(): EngineConfig {
  return {
    version: 1,
    seed: 4242,
    players: [
      {name: 'Alice', color: 'blue'},
      {name: 'Bob', color: 'red'},
    ],
    gameOptions: {
      preludeExtension: true,
      corporateEra: false,
    },
  };
}

type Fixture = {
  handle: EngineHandle;
  game: IGame;
  blue: PlayerId;
  red: PlayerId;
  store: InMemoryActionStore;
};

function newFixture(): Fixture {
  const dependencies = createDeterministicEngineDependencies({
    nowMs: FIXED_NOW_MS,
    idPrefix: 'ga5b-recovery',
  });
  const handle = new EngineFacade(dependencies).create(config());
  handle.game.players[0].user = BLUE_USER;
  handle.game.players[1].user = RED_USER;
  return {
    handle,
    game: handle.game,
    blue: handle.game.players[0].id,
    red: handle.game.players[1].id,
    store: new InMemoryActionStore({now: () => FIXED_NOW_MS}),
  };
}

function userOf(fixture: Fixture, actorId: PlayerId): string {
  return actorId === fixture.blue ? BLUE_USER : RED_USER;
}

function newGateway(fixture: Fixture, store: IActionStore = fixture.store): ActionGateway {
  return new ActionGateway({
    store,
    engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
    promptTokenSecret: SECRET,
  });
}

function games(fixture: Fixture) {
  return {
    getGame: async (id: GameId) => (id === fixture.game.id ? fixture.game : undefined),
  };
}

async function bootstrap(gateway: ActionGateway, fixture: Fixture, actorId: PlayerId): Promise<ActionBootstrapResponseV1> {
  const result = await gateway.bootstrap({
    principal: {id: userOf(fixture, actorId)},
    game: fixture.game,
    actorId,
  });
  if (result.statusCode !== 200) {
    throw new Error('bootstrap failed with ' + result.statusCode + ' ' + JSON.stringify(result.body));
  }
  return result.body as ActionBootstrapResponseV1;
}

/**
 * Builds one action envelope from server-issued bootstrap values, exactly like
 * a v2 client would. The body is reused for retries.
 */
async function envelope(
  gateway: ActionGateway,
  fixture: Fixture,
  actorId: PlayerId,
  input: unknown,
  actionId: string = crypto.randomUUID(),
): Promise<{raw: string; actorId: PlayerId}> {
  const boot = await bootstrap(gateway, fixture, actorId);
  if (boot.promptToken === undefined) {
    throw new Error('expected a server-issued prompt token');
  }
  return {
    actorId,
    raw: JSON.stringify({
      v: ACTION_SCHEMA_VERSION,
      gameId: fixture.game.id,
      actionId,
      baseRevision: boot.baseRevision,
      promptToken: boot.promptToken,
      engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
      input,
    }),
  };
}

async function post(gateway: ActionGateway, fixture: Fixture, body: {raw: string; actorId: PlayerId}) {
  return gateway.handle({
    principal: {id: userOf(fixture, body.actorId)},
    rawBody: body.raw,
    games: games(fixture),
  });
}

/** Submits one action using only server-issued bootstrap values. */
async function submit(
  gateway: ActionGateway,
  fixture: Fixture,
  actorId: PlayerId,
  input: unknown,
  options: {actionId?: string} = {},
) {
  const body = await envelope(gateway, fixture, actorId, input, options.actionId);
  return post(gateway, fixture, body);
}

function asSuccess(body: unknown): ActionSuccessResponseV1 {
  return body as ActionSuccessResponseV1;
}

/** Store decorator used for crash and corruption injection. */
class StoreProxy implements IActionStore {
  public constructor(protected readonly delegate: IActionStore) {}

  public initialize(): Promise<void> {
    return this.delegate.initialize();
  }

  public close(): Promise<void> {
    return this.delegate.close();
  }

  public openStream(request: OpenActionStreamRequest): Promise<OpenActionStreamResult> {
    return this.delegate.openStream(request);
  }

  public fenceStream(request: FenceActionStreamRequest): Promise<ActionStream> {
    return this.delegate.fenceStream(request);
  }

  public appendIntent(request: AppendActionIntentRequest): Promise<AppendActionIntentResult> {
    return this.delegate.appendIntent(request);
  }

  public getStream(gameId: GameId): Promise<ActionStream | undefined> {
    return this.delegate.getStream(gameId);
  }

  public getIntent(gameId: GameId, actionId: string): Promise<ActionIntent | undefined> {
    return this.delegate.getIntent(gameId, actionId);
  }

  public listIntents(gameId: GameId, options?: ListActionIntentsOptions): Promise<Array<ActionIntent>> {
    return this.delegate.listIntents(gameId, options);
  }

  public putGenesisSnapshot(request: PutGenesisSnapshotRequest): Promise<GenesisSnapshotRecord> {
    return this.delegate.putGenesisSnapshot(request);
  }

  public getGenesisSnapshot(gameId: GameId): Promise<GenesisSnapshotRecord | undefined> {
    return this.delegate.getGenesisSnapshot(gameId);
  }
}

/** Simulates a crash after the journal accepted the intent but before the ACK. */
class CrashAfterCommitStore extends StoreProxy {
  public override async appendIntent(request: AppendActionIntentRequest): Promise<AppendActionIntentResult> {
    await super.appendIntent(request);
    throw new Error('simulated crash after commit');
  }
}

/** Simulates a durable-store failure before the intent is written. */
class FailBeforeCommitStore extends StoreProxy {
  public override async appendIntent(_request: AppendActionIntentRequest): Promise<AppendActionIntentResult> {
    throw new Error('simulated store failure');
  }
}

/** Rewrites the recorded state hash of the last intent. */
class TamperingStore extends StoreProxy {
  public override async listIntents(gameId: GameId, options?: ListActionIntentsOptions): Promise<Array<ActionIntent>> {
    const intents = await super.listIntents(gameId, options);
    const last = intents[intents.length - 1];
    if (last !== undefined) {
      const payload = last.payload as Record<string, unknown>;
      last.payload = {...payload, stateHashAfter: 'a'.repeat(64)};
    }
    return intents;
  }
}

/** Returns a genesis snapshot that no longer hashes to the recorded anchor. */
class GenesisDriftStore extends StoreProxy {
  public override async getGenesisSnapshot(gameId: GameId): Promise<GenesisSnapshotRecord | undefined> {
    const record = await super.getGenesisSnapshot(gameId);
    if (record === undefined) {
      return undefined;
    }
    const snapshot = record.snapshot as Record<string, unknown>;
    return {...record, snapshot: {...snapshot, undoCount: 99}};
  }
}

/** Hides the tail of the journal while the head claims more revisions. */
class TruncatingStore extends StoreProxy {
  public override async listIntents(gameId: GameId, options?: ListActionIntentsOptions): Promise<Array<ActionIntent>> {
    const intents = await super.listIntents(gameId, options);
    return intents.slice(0, Math.max(0, intents.length - 1));
  }
}

describe('ActionRecovery', () => {
  before(() => {
    ensureGlobalInitialized();
  });

  it('reconstructs the same state hash and prompt token after a restart', async () => {
    const fixture = newFixture();
    const first = newGateway(fixture);
    await first.initialize();

    const action1 = await submit(first, fixture, fixture.blue, firstInput(fixture.handle, fixture.blue));
    expect(action1.statusCode).eq(200);
    expect(asSuccess(action1.body).revision).eq(1);

    const action2 = await submit(first, fixture, fixture.red, firstInput(fixture.handle, fixture.red));
    expect(action2.statusCode).eq(200);
    expect(asSuccess(action2.body).revision).eq(2);

    const beforeRestart = await new ActionRecovery({
      store: fixture.store,
      engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    }).recover({gameId: fixture.game.id, liveGame: fixture.game});
    expect(beforeRestart.revision).eq(2);
    expect(beforeRestart.verifiedPrompts).eq(2);

    // A fresh gateway shares only the durable journal; the cache and the live
    // game are both cold.
    const restarted = newGateway(fixture);
    await restarted.initialize();
    const boot = await bootstrap(restarted, fixture, fixture.blue);

    expect(boot.revision).eq(2);
    expect(boot.baseRevision).eq(2);
    expect(boot.viewHash).match(/^[0-9a-f]{64}$/);
    expect(boot.promptToken).match(/^[0-9a-f]{64}$/);

    const afterRestart = await new ActionRecovery({
      store: fixture.store,
      engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    }).recover({gameId: fixture.game.id, liveGame: fixture.game});
    expect(afterRestart.stateHash).eq(beforeRestart.stateHash);
    expect(afterRestart.verifiedPrompts).eq(2);

    // The live game was never mutated by the committed v2 actions.
    expect(fixture.game.lastSaveId).eq(0);
  });

  it('answers a retry as a single effect when the crash happened after commit', async () => {
    const fixture = newFixture();
    const crashing = newGateway(fixture, new CrashAfterCommitStore(fixture.store));
    await crashing.initialize();

    const body = await envelope(
      crashing,
      fixture,
      fixture.blue,
      firstInput(fixture.handle, fixture.blue),
    );
    const first = await post(crashing, fixture, body);
    expect(first.statusCode).eq(503);
    expect((await fixture.store.getStream(fixture.game.id))?.revision).eq(1);

    const restarted = newGateway(fixture);
    await restarted.initialize();
    const retry = await post(restarted, fixture, body);
    expect(retry.statusCode).eq(200);
    expect(asSuccess(retry.body).status).eq('duplicate');
    expect(asSuccess(retry.body).revision).eq(1);
    expect(await fixture.store.listIntents(fixture.game.id)).length(1);
  });

  it('leaves no partial state and no ACK when the store fails before commit', async () => {
    const fixture = newFixture();
    const failing = newGateway(fixture, new FailBeforeCommitStore(fixture.store));
    await failing.initialize();

    const body = await envelope(failing, fixture, fixture.blue, firstInput(fixture.handle, fixture.blue));
    const failed = await post(failing, fixture, body);
    expect(failed.statusCode).eq(503);
    expect(await fixture.store.listIntents(fixture.game.id)).length(0);
    expect((await fixture.store.getStream(fixture.game.id))?.revision).eq(0);

    const healthy = newGateway(fixture);
    await healthy.initialize();
    const retried = await post(healthy, fixture, body);
    expect(retried.statusCode).eq(200);
    expect(asSuccess(retried.body).status).eq('applied');
    expect(await fixture.store.listIntents(fixture.game.id)).length(1);
  });

  it('fails closed when a recorded state hash does not reproduce', async () => {
    const fixture = newFixture();
    const gateway = newGateway(fixture);
    await gateway.initialize();
    const applied = await submit(gateway, fixture, fixture.blue, firstInput(fixture.handle, fixture.blue));
    expect(applied.statusCode).eq(200);

    const original = new ActionRecovery({
      store: fixture.store,
      engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    });
    let code: string | undefined;
    try {
      await original.recover({gameId: fixture.game.id, liveGame: fixture.game});
    } catch (_err) {
      // Control: the untampered journal recovers.
      code = 'unexpected';
    }
    expect(code).eq(undefined);

    const tampered = new ActionRecovery({
      store: new TamperingStore(fixture.store),
      engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    });
    let failure: ActionRecoveryError | undefined;
    try {
      await tampered.recover({gameId: fixture.game.id, liveGame: fixture.game});
    } catch (err) {
      failure = err as ActionRecoveryError;
    }
    expect(failure?.code).eq('STATE_HASH_MISMATCH');
  });

  it('fails closed when the stored genesis does not reproduce its hash', async () => {
    const fixture = newFixture();
    const gateway = newGateway(fixture);
    await gateway.initialize();
    expect((await submit(gateway, fixture, fixture.blue, firstInput(fixture.handle, fixture.blue))).statusCode).eq(200);

    const recovery = new ActionRecovery({
      store: new GenesisDriftStore(fixture.store),
      engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    });
    let failure: ActionRecoveryError | undefined;
    try {
      await recovery.recover({gameId: fixture.game.id, liveGame: fixture.game});
    } catch (err) {
      failure = err as ActionRecoveryError;
    }
    expect(failure?.code).eq('GENESIS_NOT_REPRODUCIBLE');
  });

  it('fails closed when the journal is shorter than the stream head', async () => {
    const fixture = newFixture();
    const gateway = newGateway(fixture);
    await gateway.initialize();
    expect((await submit(gateway, fixture, fixture.blue, firstInput(fixture.handle, fixture.blue))).statusCode).eq(200);

    const recovery = new ActionRecovery({
      store: new TruncatingStore(fixture.store),
      engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    });
    let failure: ActionRecoveryError | undefined;
    try {
      await recovery.recover({gameId: fixture.game.id, liveGame: fixture.game});
    } catch (err) {
      failure = err as ActionRecoveryError;
    }
    expect(failure?.code).eq('JOURNAL_TRUNCATED');
  });

  it('refuses checkpoint recovery until a continuation proof exists', async () => {
    const fixture = newFixture();
    const gateway = newGateway(fixture);
    await gateway.initialize();
    expect((await submit(gateway, fixture, fixture.blue, firstInput(fixture.handle, fixture.blue))).statusCode).eq(200);

    const recovery = new ActionRecovery({
      store: fixture.store,
      engine: new EngineFacadeCandidatePort({now: () => FIXED_NOW_MS, idPrefix: 'ga5b-recovery'}),
    });
    let failure: ActionRecoveryError | undefined;
    try {
      await recovery.recover({
        gameId: fixture.game.id,
        liveGame: fixture.game,
        checkpoint: {revision: 1, stateHash: 'b'.repeat(64)},
      });
    } catch (err) {
      failure = err as ActionRecoveryError;
    }
    expect(failure?.code).eq('CHECKPOINT_UNPROVEN');
  });

  it('rejects a stale client with a resync instead of guessing the head', async () => {
    const fixture = newFixture();
    const gateway = newGateway(fixture);
    await gateway.initialize();
    const first = await bootstrap(gateway, fixture, fixture.blue);
    expect(first.baseRevision).eq(0);

    expect((await submit(gateway, fixture, fixture.blue, firstInput(fixture.handle, fixture.blue))).statusCode).eq(200);

    const staleRaw = JSON.stringify({
      v: ACTION_SCHEMA_VERSION,
      gameId: fixture.game.id,
      actionId: crypto.randomUUID(),
      baseRevision: first.baseRevision,
      promptToken: first.promptToken,
      engineVersion: ACTION_GATEWAY_ENGINE_VERSION,
      input: firstInput(fixture.handle, fixture.blue),
    });
    const stale = await gateway.handle({
      principal: {id: BLUE_USER},
      rawBody: staleRaw,
      games: games(fixture),
    });
    expect(stale.statusCode).eq(409);
    expect(stale.body).deep.contains({code: 'STALE_REVISION', currentRevision: 1, resync: 'full'});
  });
});
