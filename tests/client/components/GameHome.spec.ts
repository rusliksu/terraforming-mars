import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import GameHome from '@/client/components/GameHome.vue';
import {fakeGameOptionsModel} from './testHelpers';
import {Phase} from '@/common/Phase';

describe('GameHome', () => {
  const baseGame = {
    activePlayer: 'blue',
    id: 'game-id-123',
    phase: Phase.ACTION,
    players: [{color: 'blue', id: 'p-blue', name: 'Blue'}],
    spectatorId: undefined,
    gameOptions: fakeGameOptionsModel(),
    lastSoloGeneration: 14,
    expectedPurgeTimeMs: 0,
  };
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/game?id=game-id-123');
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: baseGame,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows active bot toggle on running game page without serverId', () => {
    window.history.replaceState({}, '', '/game?id=game-id-123');
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: {
          ...baseGame,
          botPlayers: ['p-blue'],
        },
      },
    });

    const toggle = wrapper.get('[role="switch"]');
    expect(toggle.attributes('aria-checked')).to.eq('true');
    expect(toggle.classes()).to.include('bot-toggle--active');
    expect(wrapper.get('.bot-toggle__label').classes()).not.to.include('player_bg_color_blue');
    expect(toggle.text()).to.include('Bot takeover');
    expect(toggle.text()).to.include('bot is playing');
    expect(toggle.attributes('title')).to.eq('Return control to player');
  });

  it('loads active bot players from bot takeover api on mount', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({botPlayers: ['p-blue']}),
    }) as Response;

    window.history.replaceState({}, '', '/game?id=game-id-123');
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: baseGame,
      },
    });

    await (wrapper.vm as typeof wrapper.vm & {$nextTick: () => Promise<void>}).$nextTick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wrapper.vm as typeof wrapper.vm & {$nextTick: () => Promise<void>}).$nextTick();

    const toggle = wrapper.get('[role="switch"]');
    expect(toggle.attributes('aria-checked')).to.eq('true');
    expect(toggle.classes()).to.include('bot-toggle--active');
  });

  it('does not leak serverId into copied player links', () => {
    window.history.replaceState({}, '', '/game?id=game-id-123&serverId=1');
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: baseGame,
      },
    });

    expect(wrapper.vm.getHref('p-blue')).to.eq('player?id=p-blue');
  });
});
