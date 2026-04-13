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

  afterEach(() => {
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

  it('shows active bot toggle on running game page when serverId is present', () => {
    window.history.replaceState({}, '', '/game?id=game-id-123&serverId=1');
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
    expect(toggle.text()).to.include('Bot takeover');
    expect(toggle.text()).to.include('bot is playing');
    expect(toggle.attributes('title')).to.eq('Return control to player');
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
