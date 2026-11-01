import {expect} from 'chai';
import {ACTION_SCHEMA_VERSION} from '@/common/actionProtocol/ActionProtocol';
import type {
  ActionErrorCode,
  ActionErrorResponseV1,
  ActionRequestV1,
  ActionSuccessResponseV1,
} from '@/common/actionProtocol/ActionProtocol';
import type {InputResponse} from '@/common/inputs/InputResponse';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {GameId, PlayerId} from '@/common/Types';
import {GameShellService} from '@/client/shell/GameShellService';
import {GameShellSubmitService} from '@/client/shell/GameShellSubmitService';
import type {
  GameShellSubmitIntent,
  GameShellTransport,
  GameShellTransportResponse,
} from '@/client/shell/GameShellSubmitTypes';

const GAME_ID: GameId = 'g-test';
const PLAYER_ID: PlayerId = 'p-player';
const ENGINE_VERSION = 'engine-1';
const PROMPT_TOKEN = 'prompt-token-0123456789';

function playerView(runId = 'view-1'): PlayerViewModel {
  return {
    id: PLAYER_ID,
    runId,
    game: {gameId: GAME_ID},
    waitingFor: undefined,
  } as unknown as PlayerViewModel;
}

function intent(actionId = 'action-1', baseRevision = 3): GameShellSubmitIntent {
  return {
    actionId,
    baseRevision,
    promptToken: PROMPT_TOKEN,
    engineVersion: ENGINE_VERSION,
    input: {type: 'option'} as InputResponse,
  };
}

type SuccessOptions = {
  status?: 'applied' | 'duplicate';
  view?: PlayerViewModel;
  viewRevision?: number;
};

function successResponse(actionId = 'action-1', options: SuccessOptions = {}): GameShellTransportResponse {
  const viewRevision = options.viewRevision ?? 4;
  const body: ActionSuccessResponseV1 = {
    v: ACTION_SCHEMA_VERSION,
    actionId,
    status: options.status ?? 'applied',
    revision: viewRevision,
    appliedRevision: viewRevision,
    engineVersion: ENGINE_VERSION,
    viewRevision,
    view: options.view ?? playerView(),
    viewHash: 'view-hash-' + viewRevision,
    promptToken: 'next-prompt-token-0123456789',
  };
  return {statusCode: 200, body};
}

function rejectedResponse(
  code: ActionErrorCode,
  statusCode = 409,
  extra: Partial<ActionErrorResponseV1> = {},
): GameShellTransportResponse {
  const body: ActionErrorResponseV1 = {
    v: ACTION_SCHEMA_VERSION,
    status: 'rejected',
    code,
    ...extra,
  };
  return {statusCode, body};
}

class MockTransport implements GameShellTransport {
  public readonly posts: Array<ActionRequestV1> = [];
  public readonly resyncs: Array<PlayerId | undefined> = [];
  public postHandler: (request: ActionRequestV1) => Promise<GameShellTransportResponse> =
    async () => successResponse();
  public resyncHandler: (playerId?: PlayerId) => Promise<PlayerViewModel> =
    async () => playerView('resynced');

  public async post(request: ActionRequestV1): Promise<GameShellTransportResponse> {
    this.posts.push(request);
    return this.postHandler(request);
  }

  public async fetchPlayerView(playerId?: PlayerId): Promise<PlayerViewModel> {
    this.resyncs.push(playerId);
    return this.resyncHandler(playerId);
  }
}

type ServiceFixture = {
  shell: GameShellService;
  transport: MockTransport;
  service: GameShellSubmitService;
  sleeps: Array<number>;
};

function makeService(options: {maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number} = {}): ServiceFixture {
  const shell = new GameShellService();
  const transport = new MockTransport();
  const sleeps: Array<number> = [];
  const service = new GameShellSubmitService({
    gameId: GAME_ID,
    transport,
    shell,
    policy: {
      maxAttempts: options.maxAttempts ?? 3,
      baseDelayMs: options.baseDelayMs ?? 250,
      maxDelayMs: options.maxDelayMs ?? 2000,
    },
    sleep: async (delayMs: number) => {
      sleeps.push(delayMs);
    },
  });
  return {shell, transport, service, sleeps};
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, resolve, reject};
}

async function flushMicrotasks(times = 20): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('GameShellSubmitService', () => {
  it('applies a confirmed intent, sends the full protocol body, and clears pending', async () => {
    const {shell, transport, service} = makeService();
    const confirmed = playerView('confirmed');
    transport.postHandler = async () => successResponse('action-1', {view: confirmed, viewRevision: 7});

    const outcome = await service.submit(intent('action-1'));

    expect(outcome.status).eq('applied');
    if (outcome.status !== 'applied') {
      return;
    }
    expect(outcome.viewApplied).eq(true);
    expect(outcome.viewRevision).eq(7);
    expect(outcome.revision).eq(7);
    expect(shell.getConfirmedView()).eq(confirmed);
    expect(shell.getViewRevision()).eq(1);
    expect(service.getPendingActionIds()).deep.eq([]);
    expect(shell.getPendingIntents()).deep.eq([]);
    expect(transport.posts).length(1);
    expect(transport.posts[0]).deep.include({
      v: ACTION_SCHEMA_VERSION,
      gameId: GAME_ID,
      actionId: 'action-1',
      baseRevision: 3,
      promptToken: PROMPT_TOKEN,
      engineVersion: ENGINE_VERSION,
      input: {type: 'option'},
    });
  });

  it('coalesces a repeated submit with the same actionId into one transport effect', async () => {
    const {shell, transport, service} = makeService();
    const gate = deferred<GameShellTransportResponse>();
    transport.postHandler = () => gate.promise;

    const first = service.submit(intent('action-1'));
    const second = service.submit({...intent('action-1'), baseRevision: 99});
    expect(first).eq(second);
    expect(service.getPendingActionIds()).deep.eq(['action-1']);
    expect(transport.posts).length(1);

    gate.resolve(successResponse('action-1', {viewRevision: 5}));
    const [firstOutcome, secondOutcome] = await Promise.all([first, second]);
    expect(firstOutcome).eq(secondOutcome);
    expect(transport.posts).length(1);

    // A later click with the already-settled intent is served from the cache.
    const later = await service.submit(intent('action-1'));
    expect(transport.posts).length(1);
    expect(later).eq(firstOutcome);
    expect(shell.getPendingIntents()).deep.eq([]);
  });

  it('rejects a reused actionId with a different payload without a second effect', async () => {
    const {transport, service} = makeService();
    await service.submit(intent('action-1'));
    expect(transport.posts).length(1);

    const conflicting = await service.submit(intent('action-1', 10));
    expect(conflicting.status).eq('rejected');
    if (conflicting.status !== 'rejected') {
      return;
    }
    expect(conflicting.code).eq('IDEMPOTENCY_CONFLICT');
    expect(transport.posts).length(1);
  });

  it('retries a transient network failure with the same actionId and bounded backoff', async () => {
    const {shell, transport, service, sleeps} = makeService();
    let attempts = 0;
    transport.postHandler = async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('offline');
      }
      return successResponse('action-1', {view: playerView('confirmed'), viewRevision: 6});
    };

    const outcome = await service.submit(intent('action-1'));

    expect(outcome.status).eq('applied');
    expect(transport.posts).length(2);
    expect(transport.posts[0].actionId).eq(transport.posts[1].actionId);
    expect(transport.posts[0]).deep.eq(transport.posts[1]);
    expect(sleeps).deep.eq([250]);
    expect(shell.getConfirmedView()?.runId).eq('confirmed');
    expect(service.getPendingActionIds()).deep.eq([]);
  });

  it('retries 5xx responses with the same actionId and caps the backoff', async () => {
    const {transport, service, sleeps} = makeService({maxAttempts: 4, maxDelayMs: 300});
    let attempts = 0;
    transport.postHandler = async () => {
      attempts++;
      if (attempts < 4) {
        return rejectedResponse('PERSISTENCE_FAILURE', 503, {retryable: true});
      }
      return successResponse('action-1', {viewRevision: 8});
    };

    const outcome = await service.submit(intent('action-1'));

    expect(outcome.status).eq('applied');
    expect(transport.posts).length(4);
    expect(transport.posts.map((request) => request.actionId)).deep.eq([
      'action-1',
      'action-1',
      'action-1',
      'action-1',
    ]);
    expect(sleeps).deep.eq([250, 300, 300]);
  });

  it('stops after bounded attempts and retries the stored intent with the same actionId', async () => {
    const {transport, service, sleeps} = makeService({maxAttempts: 2});
    transport.postHandler = async () => rejectedResponse('PERSISTENCE_FAILURE', 503, {retryable: true});

    const failed = await service.submit(intent('action-1'));

    expect(failed.status).eq('failed');
    if (failed.status !== 'failed') {
      return;
    }
    expect(failed.reason).eq('transport');
    expect(failed.retryable).eq(true);
    expect(failed.attempts).eq(2);
    expect(sleeps).deep.eq([250]);
    expect(transport.posts).length(2);
    expect(service.getPendingActionIds()).deep.eq(['action-1']);

    transport.postHandler = async () => successResponse('action-1', {viewRevision: 9});
    const retried = await service.retry('action-1');

    expect(retried.status).eq('applied');
    expect(transport.posts).length(3);
    expect(transport.posts[2].actionId).eq(transport.posts[0].actionId);
    expect(service.getPendingActionIds()).deep.eq([]);
  });

  it('treats a duplicate response after a lost reply as one settled effect', async () => {
    const {shell, transport, service} = makeService();
    let attempts = 0;
    transport.postHandler = async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('reply lost');
      }
      return successResponse('action-1', {
        status: 'duplicate',
        view: playerView('duplicate-view'),
        viewRevision: 8,
      });
    };

    let confirmations = 0;
    let lastRevision = shell.getViewRevision();
    shell.subscribe((snapshot) => {
      if (snapshot.viewRevision !== lastRevision) {
        lastRevision = snapshot.viewRevision;
        confirmations++;
      }
    });

    const outcome = await service.submit(intent('action-1'));

    expect(outcome.status).eq('duplicate');
    expect(transport.posts).length(2);
    expect(transport.posts.map((request) => request.actionId)).deep.eq(['action-1', 'action-1']);
    expect(confirmations).eq(1);
    expect(shell.getConfirmedView()?.runId).eq('duplicate-view');
    expect(shell.getViewRevision()).eq(1);
    expect(service.getPendingActionIds()).deep.eq([]);
  });

  const staleCodes: Array<ActionErrorCode> = [
    'STALE_PROMPT',
    'STALE_REVISION',
    'ENGINE_VERSION_MISMATCH',
  ];
  for (const code of staleCodes) {
    it('performs exactly one full resync on ' + code, async () => {
      const {shell, transport, service} = makeService();
      const before = playerView('before');
      const after = playerView('after');
      shell.setConfirmedView(before, 3);
      transport.postHandler = async () => rejectedResponse(code, 409, {
        currentRevision: 12,
        resync: 'full',
      });
      transport.resyncHandler = async () => after;

      const outcome = await service.submit(intent('action-1'));

      expect(outcome.status).eq('rejected');
      if (outcome.status !== 'rejected') {
        return;
      }
      expect(outcome.code).eq(code);
      expect(outcome.resynced).eq(true);
      expect(outcome.retryable).eq(false);
      expect(transport.resyncs).length(1);
      expect(transport.resyncs[0]).eq(PLAYER_ID);
      expect(transport.posts).length(1);
      expect(shell.getConfirmedView()).eq(after);
      expect(shell.getViewRevision()).eq(4);
      expect(service.getPendingActionIds()).deep.eq([]);
      expect(shell.getPendingIntents()).deep.eq([]);
    });
  }

  it('coalesces concurrent stale conflicts into one full resync', async () => {
    const {transport, service} = makeService();
    const gate = deferred<PlayerViewModel>();
    transport.postHandler = async () => rejectedResponse('STALE_PROMPT', 409);
    transport.resyncHandler = () => gate.promise;

    const first = service.submit(intent('action-1'));
    const second = service.submit(intent('action-2'));
    await flushMicrotasks();

    expect(transport.posts).length(2);
    expect(transport.resyncs).length(1);

    gate.resolve(playerView('resynced'));
    await Promise.all([first, second]);
    expect(transport.resyncs).length(1);
  });

  it('resyncs an independent second writer after a cross-tab conflict', async () => {
    const tabA = makeService();
    const tabB = makeService();
    const sharedView = playerView('shared');
    tabA.transport.postHandler = async () => successResponse('action-a', {view: sharedView, viewRevision: 7});
    await tabA.service.submit(intent('action-a'));
    expect(tabA.shell.getConfirmedView()).eq(sharedView);

    tabB.shell.setConfirmedView(playerView('tab-b-before'), 2);
    tabB.transport.postHandler = async () => rejectedResponse('STALE_REVISION', 409, {
      currentRevision: 7,
      resync: 'full',
    });
    tabB.transport.resyncHandler = async () => sharedView;

    const outcome = await tabB.service.submit(intent('action-b'));

    expect(outcome.status).eq('rejected');
    if (outcome.status !== 'rejected') {
      return;
    }
    expect(outcome.resynced).eq(true);
    expect(tabB.transport.posts).length(1);
    expect(tabB.transport.resyncs).length(1);
    expect(tabB.shell.getConfirmedView()).eq(sharedView);
  });

  it('does not overwrite a newer confirmed view with a stale response', async () => {
    const {shell, transport, service} = makeService();
    const oldView = playerView('old');
    const newerView = playerView('newer');
    shell.setConfirmedView(oldView, 2);
    const gate = deferred<GameShellTransportResponse>();
    transport.postHandler = () => gate.promise;

    const promise = service.submit(intent('action-1'));
    await flushMicrotasks();
    expect(transport.posts).length(1);

    shell.setConfirmedView(newerView, 9);
    gate.resolve(successResponse('action-1', {view: oldView, viewRevision: 5}));

    const outcome = await promise;

    expect(outcome.status).eq('applied');
    if (outcome.status !== 'applied') {
      return;
    }
    expect(outcome.viewApplied).eq(false);
    expect(shell.getConfirmedView()).eq(newerView);
    expect(shell.getViewRevision()).eq(9);
    expect(service.getPendingActionIds()).deep.eq([]);
  });

  const terminalCases: Array<[number, ActionErrorCode]> = [
    [400, 'INVALID_SCHEMA'],
    [401, 'UNAUTHORIZED'],
    [403, 'UNAUTHORIZED'],
  ];
  for (const [statusCode, code] of terminalCases) {
    it('does not retry or resync on HTTP ' + statusCode, async () => {
      const {transport, service, sleeps} = makeService();
      transport.postHandler = async () => rejectedResponse(code, statusCode);

      const outcome = await service.submit(intent('action-1'));

      expect(outcome.status).eq('rejected');
      if (outcome.status !== 'rejected') {
        return;
      }
      expect(outcome.code).eq(code);
      expect(outcome.retryable).eq(false);
      expect(outcome.resynced).eq(false);
      expect(transport.posts).length(1);
      expect(transport.resyncs).length(0);
      expect(sleeps).deep.eq([]);
      expect(service.getPendingActionIds()).deep.eq([]);
    });
  }
});
