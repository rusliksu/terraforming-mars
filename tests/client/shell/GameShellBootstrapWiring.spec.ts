import {expect} from 'chai';
import {ACTION_SCHEMA_VERSION} from '@/common/actionProtocol/ActionProtocol';
import type {
  ActionBootstrapResponseV1,
  ActionRequestV1,
  ActionSuccessResponseV1,
} from '@/common/actionProtocol/ActionProtocol';
import type {InputResponse} from '@/common/inputs/InputResponse';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {GameId, PlayerId} from '@/common/Types';
import {
  GameShellBootstrapCache,
  installGameShellBootstrapProvider,
} from '@/client/shell/GameShellBootstrapCache';
import {setGameShellEnabledForTest} from '@/client/shell/GameShellFeatureFlag';
import {GameShellService} from '@/client/shell/GameShellService';
import {GameShellWaitingForBridge} from '@/client/shell/GameShellWaitingForBridge';
import type {
  GameShellTransport,
  GameShellTransportResponse,
} from '@/client/shell/GameShellSubmitTypes';

const GAME_ID: GameId = 'g-bootstrap';
const PLAYER_ID: PlayerId = 'p-bootstrap';
const ENGINE_VERSION = 'engine-1';

function view(): PlayerViewModel {
  return {id: PLAYER_ID, runId: 'view-1', game: {gameId: GAME_ID}} as unknown as PlayerViewModel;
}

function readyBootstrap(promptToken = 'prompt-token-0123456789'): ActionBootstrapResponseV1 {
  return {
    v: ACTION_SCHEMA_VERSION,
    status: 'ready',
    gameId: GAME_ID,
    playerId: PLAYER_ID,
    revision: 5,
    baseRevision: 5,
    promptToken,
    promptType: 'SelectOption',
    engineVersion: ENGINE_VERSION,
    view: view(),
    viewRevision: 5,
    viewHash: 'view-hash',
  };
}

class MockBootstrapTransport {
  public calls: Array<PlayerId> = [];
  public response: ActionBootstrapResponseV1 | undefined = readyBootstrap();

  public async fetchBootstrap(playerId: PlayerId): Promise<ActionBootstrapResponseV1 | undefined> {
    this.calls.push(playerId);
    return this.response;
  }
}

class MockSubmitTransport implements GameShellTransport {
  public readonly posts: Array<ActionRequestV1> = [];

  public async post(request: ActionRequestV1): Promise<GameShellTransportResponse> {
    this.posts.push(request);
    const body: ActionSuccessResponseV1 = {
      v: ACTION_SCHEMA_VERSION,
      actionId: request.actionId,
      status: 'applied',
      revision: 6,
      appliedRevision: 6,
      engineVersion: ENGINE_VERSION,
      viewRevision: 6,
      view: view(),
      viewHash: 'view-hash-2',
      promptToken: 'next-prompt-token-0123456789',
    };
    return {statusCode: 200, body};
  }

  public async fetchPlayerView(): Promise<PlayerViewModel> {
    return view();
  }
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('timed out');
}

function makeBridge() {
  const shell = new GameShellService();
  const transport = new MockSubmitTransport();
  const bridge = new GameShellWaitingForBridge({
    shell,
    transport,
    createActionId: () => 'action-bootstrap',
    sleep: async () => {},
  });
  return {bridge, shell, transport};
}

describe('GameShell bootstrap wiring', () => {
  afterEach(() => setGameShellEnabledForTest(undefined));

  it('does not submit through v2 when the feature flag is disabled', async () => {
    setGameShellEnabledForTest(false);
    const bootstrap = new MockBootstrapTransport();
    const cache = new GameShellBootstrapCache(bootstrap);
    await cache.refresh(view());
    const {bridge, transport} = makeBridge();
    bridge.setBootstrapProvider((playerView) => cache.get(playerView));
    expect(bridge.trySubmit(view(), {type: 'option'} as InputResponse)).eq(false);
    expect(transport.posts).length(0);
  });

  it('stays on legacy when bootstrap is disabled (404) or forbidden (403)', async () => {
    setGameShellEnabledForTest(true);
    for (const response of [undefined, undefined]) {
      const bootstrap = new MockBootstrapTransport();
      bootstrap.response = response;
      const cache = new GameShellBootstrapCache(bootstrap);
      await cache.refresh(view());
      const {bridge, transport} = makeBridge();
      bridge.setBootstrapProvider((playerView) => cache.get(playerView));
      expect(bridge.trySubmit(view(), {type: 'option'} as InputResponse)).eq(false);
      expect(transport.posts).length(0);
    }
  });

  it('switches to v2 after a ready bootstrap and refreshes the rotated token', async () => {
    setGameShellEnabledForTest(true);
    const bootstrap = new MockBootstrapTransport();
    const cache = new GameShellBootstrapCache(bootstrap);
    await cache.refresh(view());
    const {bridge, transport} = makeBridge();
    bridge.setBootstrapProvider((playerView) => cache.get(playerView));
    bridge.setOutcomeListener((outcome) => cache.applyOutcome(outcome));

    expect(bridge.trySubmit(view(), {type: 'option'} as InputResponse)).eq(true);
    await waitFor(() => transport.posts.length === 1);
    expect(transport.posts[0].baseRevision).eq(5);
    expect(transport.posts[0].promptToken).eq('prompt-token-0123456789');
    // The mock outcome carries the next server-issued token.
    await waitFor(() => cache.get(view())?.promptToken === 'next-prompt-token-0123456789');
  });

  it('installs a synchronous provider from the server bootstrap', async () => {
    setGameShellEnabledForTest(true);
    const bootstrap = new MockBootstrapTransport();
    let provider: ((playerView: PlayerViewModel) => {promptToken: string} | undefined) | undefined;
    let outcomeListener: unknown;
    const fakeBridge = {
      setBootstrapProvider: (next: typeof provider) => {
        provider = next;
      },
      setOutcomeListener: (listener: unknown) => {
        outcomeListener = listener;
      },
    };
    const cache = installGameShellBootstrapProvider(fakeBridge, bootstrap);
    await cache.refresh(view());
    expect(provider?.(view())?.promptToken).eq('prompt-token-0123456789');
    expect(outcomeListener).is.a('function');
  });
});
