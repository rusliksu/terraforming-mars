import {expect} from 'chai';
import {ACTION_SCHEMA_VERSION} from '@/common/actionProtocol/ActionProtocol';
import type {ActionRequestV1, ActionSuccessResponseV1} from '@/common/actionProtocol/ActionProtocol';
import type {InputResponse} from '@/common/inputs/InputResponse';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {GameId, PlayerId} from '@/common/Types';
import WaitingFor from '@/client/components/WaitingFor.vue';
import {setGameShellEnabledForTest} from '@/client/shell/GameShellFeatureFlag';
import {GameShellService} from '@/client/shell/GameShellService';
import {
  GameShellWaitingForBridge,
  setGameShellWaitingForBridgeForTest,
} from '@/client/shell/GameShellWaitingForBridge';
import type {GameShellPromptBootstrap} from '@/client/shell/GameShellWaitingForBridge';
import type {
  GameShellTransport,
  GameShellTransportResponse,
} from '@/client/shell/GameShellSubmitTypes';

const GAME_ID: GameId = 'g-test';
const PLAYER_ID: PlayerId = 'p-player';
const ENGINE_VERSION = 'engine-1';
const PROMPT_TOKEN = 'prompt-token-0123456789';

const BOOTSTRAP: GameShellPromptBootstrap = {
  gameId: GAME_ID,
  baseRevision: 5,
  promptToken: PROMPT_TOKEN,
  engineVersion: ENGINE_VERSION,
};

function playerView(runId = 'view-1'): PlayerViewModel {
  return {
    id: PLAYER_ID,
    runId,
    game: {gameId: GAME_ID},
    waitingFor: undefined,
  } as unknown as PlayerViewModel;
}

function successResponse(actionId = 'action-1'): GameShellTransportResponse {
  const body: ActionSuccessResponseV1 = {
    v: ACTION_SCHEMA_VERSION,
    actionId,
    status: 'applied',
    revision: 6,
    appliedRevision: 6,
    engineVersion: ENGINE_VERSION,
    viewRevision: 6,
    view: playerView('confirmed'),
    viewHash: 'view-hash',
    promptToken: 'next-prompt-token-0123456789',
  };
  return {statusCode: 200, body};
}

class MockTransport implements GameShellTransport {
  public readonly posts: Array<ActionRequestV1> = [];
  public readonly resyncs: Array<PlayerId | undefined> = [];
  public postHandler: (request: ActionRequestV1) => Promise<GameShellTransportResponse> =
    async (request) => successResponse(request.actionId);
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

type BridgeFixture = {
  bridge: GameShellWaitingForBridge;
  shell: GameShellService;
  transport: MockTransport;
};

function makeBridge(): BridgeFixture {
  const shell = new GameShellService();
  const transport = new MockTransport();
  let nextActionId = 1;
  const bridge = new GameShellWaitingForBridge({
    shell,
    transport,
    createActionId: () => 'action-' + (nextActionId++),
    sleep: async () => {},
  });
  return {bridge, shell, transport};
}

async function flushMicrotasks(times = 20): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('timed out waiting for ' + label);
}

type WaitingForContext = {
  playerView: PlayerViewModel;
  fetchPlayerInput: (...args: Array<unknown>) => void;
};

type WaitingForMethods = {
  onsave: (this: WaitingForContext, input: InputResponse) => void;
};

const onsave = (WaitingFor as unknown as {methods: WaitingForMethods}).methods.onsave;

describe('GameShell WaitingFor bridge', () => {
  afterEach(() => {
    setGameShellWaitingForBridgeForTest(undefined);
    setGameShellEnabledForTest(undefined);
  });

  it('keeps the legacy path while the feature flag is off', () => {
    setGameShellEnabledForTest(false);
    const {bridge, shell, transport} = makeBridge();
    bridge.setBootstrapProvider(() => BOOTSTRAP);

    const accepted = bridge.trySubmit(playerView(), {type: 'option'});

    expect(accepted).eq(false);
    expect(transport.posts).length(0);
    expect(shell.getPendingIntents()).deep.eq([]);
  });

  it('keeps the legacy path when no server-issued bootstrap exists', () => {
    setGameShellEnabledForTest(true);
    const {bridge, shell, transport} = makeBridge();

    const accepted = bridge.trySubmit(playerView(), {type: 'option'});

    expect(accepted).eq(false);
    expect(transport.posts).length(0);
    expect(shell.getPendingIntents()).deep.eq([]);
  });

  it('submits v2 with a stable actionId when flag and bootstrap are available', async () => {
    setGameShellEnabledForTest(true);
    const {bridge, shell, transport} = makeBridge();
    bridge.setBootstrapProvider(() => BOOTSTRAP);

    expect(bridge.trySubmit(playerView(), {type: 'option'})).eq(true);
    await waitFor(() => transport.posts.length === 1, 'first v2 submit');
    expect(transport.posts[0]).deep.include({
      v: ACTION_SCHEMA_VERSION,
      gameId: GAME_ID,
      actionId: 'action-1',
      baseRevision: 5,
      promptToken: PROMPT_TOKEN,
      engineVersion: ENGINE_VERSION,
      input: {type: 'option'},
    });
    await waitFor(() => shell.getViewRevision() === 1, 'confirmed view');

    // The same prompt/input maps to the same actionId and the settled outcome
    // is served locally, so a repeated click has no second transport effect.
    expect(bridge.trySubmit(playerView(), {type: 'option'})).eq(true);
    await flushMicrotasks();
    expect(transport.posts).length(1);
    expect(shell.getPendingIntents()).deep.eq([]);

    // A different answer is a different intent and gets its own actionId.
    const secondInput: InputResponse = {type: 'or', index: 0, response: {type: 'option'}};
    expect(bridge.trySubmit(playerView(), secondInput)).eq(true);
    await waitFor(() => transport.posts.length === 2, 'second v2 submit');
    expect(transport.posts[1].actionId).eq('action-2');
    expect(transport.posts[1].input).deep.eq(secondInput);
  });

  it('keeps the legacy onsave POST when the flag is off', () => {
    setGameShellEnabledForTest(false);
    const {bridge, transport} = makeBridge();
    bridge.setBootstrapProvider(() => BOOTSTRAP);
    setGameShellWaitingForBridgeForTest(bridge);
    const legacyCalls: Array<Array<unknown>> = [];

    onsave.call({
      playerView: playerView(),
      fetchPlayerInput: (...args: Array<unknown>) => {
        legacyCalls.push(args);
      },
    }, {type: 'option'});

    expect(legacyCalls).length(1);
    expect(legacyCalls[0][0]).eq('player/input?id=' + PLAYER_ID);
    expect(transport.posts).length(0);
  });

  it('routes onsave through v2 when the flag and bootstrap are available', async () => {
    setGameShellEnabledForTest(true);
    const {bridge, transport} = makeBridge();
    bridge.setBootstrapProvider(() => BOOTSTRAP);
    setGameShellWaitingForBridgeForTest(bridge);
    const legacyCalls: Array<Array<unknown>> = [];

    onsave.call({
      playerView: playerView(),
      fetchPlayerInput: (...args: Array<unknown>) => {
        legacyCalls.push(args);
      },
    }, {type: 'option'});

    expect(legacyCalls).length(0);
    await waitFor(() => transport.posts.length === 1, 'onsave v2 submit');
    expect(transport.posts[0].actionId).eq('action-1');
    expect(transport.posts[0].input).deep.eq({type: 'option'});
  });
});
