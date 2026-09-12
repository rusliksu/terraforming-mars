import {flushPromises, shallowMount} from '@vue/test-utils';
import {expect, vi} from 'vitest';
import ReplayHome from '@/client/components/replay/ReplayHome.vue';
import GameBoardView from '@/client/components/GameBoardView.vue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import {ReplayFrame} from '@/common/models/ReplayModel';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {globalConfig} from '../getLocalVue';
import {fakeGameModel, fakePublicPlayerModel} from '../testHelpers';

describe('ReplayHome', () => {
  let ids: Array<number>;
  const urls: Array<string> = [];

  beforeEach(() => {
    window.history.replaceState({}, '', '/replay?id=sreplay');
    ids = [0, 4, 9];
    urls.length = 0;
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      urls.push(String(url));
      const saveId = new URL(String(url), 'http://localhost').searchParams.get('saveId');
      const id = Number(saveId);
      const frame: ReplayFrame = {saveId: id,
        view: {id: 'sreplay', runId: 'replay', color: 'neutral', thisPlayer: undefined,
          game: fakeGameModel({generation: id + 1}), players: [fakePublicPlayerModel({megacredits: 30 + id})]},
        logs: [{type: LogMessageType.DEFAULT, message: 'Public record ' + id, data: [], timestamp: 0}]};
      return {ok: true, json: async () => saveId === null ? {name: 'Recorded game', spectatorId: 'sreplay', saveIds: ids} : frame};
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  function mount() {
    return shallowMount(ReplayHome, {global: {...globalConfig.global, stubs: {LogMessageComponent: false}}});
  }

  it('connects labelled controls to recorded board, player values and static log', async () => {
    const wrapper = mount();
    expect(wrapper.text()).toContain('Loading replay...');
    await flushPromises();
    expect(wrapper.get('.replay-frame').attributes('data-replay-save')).toBe('0');
    expect(wrapper.get('[aria-label="First save"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('a').attributes('href')).toBe('/spectator?id=sreplay');
    expect(wrapper.text()).toContain('Public record 0');
    await wrapper.get('[aria-label="Next save"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('.replay-frame').attributes('data-replay-save')).toBe('4');
    expect(wrapper.getComponent(GameBoardView).props('game').generation).toBe(5);
    expect(wrapper.getComponent(PlayersOverview).props('playerView').players[0].megacredits).toBe(34);
    expect(wrapper.text()).toContain('Public record 4');
    expect(wrapper.text()).not.toContain('Public record 0');
    await wrapper.get('input[type="range"]').setValue(2);
    await flushPromises();
    expect(wrapper.get('.replay-frame').attributes('data-replay-save')).toBe('9');
    expect(wrapper.get('[aria-label="Next save"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[aria-label="First save"]').trigger('click');
    await flushPromises();
    await wrapper.get('.replay-play').trigger('click');
    expect(wrapper.get('.replay-play').text()).toBe('Pause replay');
    await wrapper.get('input[type="range"]').setValue(1);
    expect(wrapper.get('.replay-play').text()).toBe('Play replay');
    expect(urls.every((url) => url.startsWith('/api/replay?'))).toBe(true);
    expect(wrapper.find('waiting-for-stub').exists()).toBe(false);
    expect(wrapper.find('log-panel-stub').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows a safe error instead of the old frame and offers retry and return', async () => {
    const wrapper = mount();
    await flushPromises();
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: false})));
    await wrapper.get('[aria-label="Next save"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('Replay unavailable.');
    expect(wrapper.find('.replay-frame').exists()).toBe(false);
    expect(wrapper.get('.replay-play').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[role="alert"] button').text()).toBe('Retry replay');
    expect(wrapper.get('a').attributes('href')).toBe('/spectator?id=sreplay');
  });

  it('keeps the board as the main scalable element and explains the way back to the lobby', async () => {
    const wrapper = mount();
    await flushPromises();

    const scaler = wrapper.get('[data-test="replay-board-inner"]');
    expect(scaler.findComponent(GameBoardView).exists()).toBe(true);
    expect(scaler.element.contains(wrapper.getComponent(GameBoardView).element)).toBe(true);

    const back = wrapper.get('a');
    expect(back.attributes('href')).toBe('/spectator?id=sreplay');
    expect(back.attributes('data-tooltip')).toBe('Back to the game page, where the lobby lists every player link');
    expect(wrapper.find('.replay-back-hint').exists()).toBe(false);
    wrapper.unmount();
  });

  it('distinguishes no saves and one saved frame', async () => {
    ids = [];
    const empty = mount();
    await flushPromises();
    expect(empty.text()).toContain('No saved states are available.');
    expect(empty.find('.replay-frame').exists()).toBe(false);
    empty.unmount();
    ids = [9];
    const single = mount();
    await flushPromises();
    expect(single.get('.replay-frame').attributes('data-replay-save')).toBe('9');
    expect(single.get('input').attributes('disabled')).toBeDefined();
    expect(single.get('.replay-play').attributes('disabled')).toBeDefined();
  });
});
