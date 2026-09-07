import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {paths} from '@/common/app/paths';
import {statusCode} from '@/common/http/statusCode';
import App from '@/client/components/App.vue';
import {getLoadErrorMessage} from '@/client/utils/loadErrorMessage';
import {globalConfig} from './getLocalVue';
import {fakeGameOptionsModel} from './testHelpers';
import {Phase} from '@/common/Phase';

describe('App', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(App, globalConfig);
    expect(wrapper.exists()).to.be.true;
  });

  it('shows a specific message for stale game links', () => {
    expect(getLoadErrorMessage(paths.GAME, statusCode.notFound)).contains('Game not found');
  });

  it('keeps the generic message for other load failures', () => {
    expect(getLoadErrorMessage(paths.GAME, statusCode.internalServerError)).eq('Error getting game data');
  });

  it('drops legacy bot invite fragments while canonicalizing a game URL', async () => {
    window.history.replaceState({}, '', '/game?id=game-id#botTakeoverToken=shared%20invite');
    global.fetch = (async () => ({
      ok: true,
      json: async () => ({
        activePlayer: 'blue',
        id: 'game-id',
        name: 'Invite smoke',
        phase: Phase.ACTION,
        players: [{color: 'blue', id: 'p-blue', isBotControlled: false, isSurrendered: false, name: 'Blue'}],
        spectatorId: 's-spectator',
        gameOptions: fakeGameOptionsModel(),
        lastSoloGeneration: 14,
        expectedPurgeTimeMs: 0,
      }),
    })) as unknown as typeof fetch;

    const wrapper = shallowMount(App, globalConfig);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.location.pathname + window.location.search + window.location.hash)
      .to.eq('/game?id=game-id');
    wrapper.unmount();
  });
});
