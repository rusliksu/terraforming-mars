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
      props: {game: baseGame},
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows a recreate link for the current game setup', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {game: baseGame},
    });

    expect(wrapper.text()).to.contain('Recreate game (same setup)');
    const recreateLink = wrapper.findAll('a').find((link) => link.text().includes('Recreate game (same setup)'));
    expect(recreateLink).to.not.be.undefined;
    expect(recreateLink?.attributes('title')).to.eq('Create a new game with the same initial setup');
    expect(recreateLink?.attributes('href')).to.eq('new-game?cloneGameId=game-id-123');
  });

  it('does not expose bot mutation controls on the public game page', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: {...baseGame, botPlayers: ['p-blue']},
      },
    });

    expect(wrapper.find('[role="switch"]').exists()).is.false;
  });

  it('propagates the shared lobby capability to every player but not the spectator', () => {
    window.history.replaceState({}, '', '/game?id=game-id-123#botTakeoverToken=shared%20invite');
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: {
          ...baseGame,
          spectatorId: 's-spectator',
        },
      },
    });

    expect(wrapper.vm.getHref('p-blue')).to.eq('player?id=p-blue#botTakeoverToken=shared%20invite');
    expect(wrapper.vm.getHref('s-spectator')).to.eq('spectator?id=s-spectator');
    expect(wrapper.vm.getHref('p-blue')).not.contain('serverId');
  });

  it('keeps player links bare when the lobby has no capability fragment', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {game: baseGame},
    });

    expect(wrapper.vm.getHref('p-blue')).to.eq('player?id=p-blue');
  });
});
