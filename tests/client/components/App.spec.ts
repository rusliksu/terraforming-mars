import {flushPromises, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import {paths} from '@/common/app/paths';
import {statusCode} from '@/common/http/statusCode';
import App from '@/client/components/App.vue';
import PlayerTimer from '@/client/components/overview/PlayerTimer.vue';
import {getLoadErrorMessage} from '@/client/utils/loadErrorMessage';
import {globalConfig} from './getLocalVue';
import {fakeGameOptionsModel, fakePlayerViewModel, fakePublicPlayerModel, fakeTimerModel} from './testHelpers';
import {Phase} from '@/common/Phase';
import {defineComponent, nextTick, onMounted, onUnmounted} from 'vue';

describe('App', () => {
  const originalFetch = global.fetch;

  afterEach(async () => {
    await vi.dynamicImportSettled();
    global.fetch = originalFetch;
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(App, globalConfig);
    expect(wrapper.exists()).to.be.true;
  });

  it('restarts the visible timer when a refreshed player view starts the next turn', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    let mounts = 0;
    let unmounts = 0;
    const PlayerHomeStub = defineComponent({
      components: {PlayerTimer},
      props: {
        playerView: {type: Object, required: true},
      },
      setup() {
        onMounted(() => mounts++);
        onUnmounted(() => unmounts++);
      },
      template: '<div data-test="player-home-stub">{{playerView.runId}}<PlayerTimer :timer="playerView.thisPlayer.timer" :live="true" /></div>',
    });
    const wrapper = shallowMount(App, {
      global: {
        ...globalConfig.global,
        stubs: {PlayerHome: PlayerHomeStub, PlayerTimer: false},
      },
    });
    const timer = {...fakeTimerModel(), afterFirstAction: true, running: false, sumElapsed: 10000};
    wrapper.vm.playerView = fakePlayerViewModel({
      runId: 'first-run', thisPlayer: fakePublicPlayerModel({timer}),
    });
    wrapper.vm.screen = 'player-home';
    await nextTick();

    expect(mounts).eq(1);
    expect(unmounts).eq(0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(wrapper.find('.player-timer-seconds').text()).eq('10');

    window.history.replaceState({}, '', '/player?id=p-blue-id&noredirect');
    global.fetch = (() => Promise.resolve({
      ok: true,
      json: async () => fakePlayerViewModel({
        runId: 'second-run',
        thisPlayer: fakePublicPlayerModel({timer: {...timer, running: true, startedAt: Date.now()}}),
      }),
    })) as unknown as typeof fetch;
    wrapper.vm.updatePlayer();
    await flushPromises();
    await nextTick();

    await vi.advanceTimersByTimeAsync(2000);
    expect(wrapper.find('.player-timer-seconds').text()).eq('12');
    expect(mounts).eq(2);
    expect(unmounts).eq(1);
    wrapper.unmount();
  });

  it('opens a direct replay link without loading a live player or spectator model', () => {
    window.history.replaceState({}, '', '/replay?id=sreplay');
    const requests: Array<string> = [];
    global.fetch = (async (url) => {
      requests.push(String(url));
      throw new Error('Live model requested');
    }) as typeof fetch;
    const wrapper = shallowMount(App, {global: {...globalConfig.global, stubs: {ReplayHome: true}}});
    expect(wrapper.vm.screen).eq('replay');
    expect(requests).deep.eq([]);
    wrapper.unmount();
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
