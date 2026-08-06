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

  it('builds a capability fragment only when create response data contains it', () => {
    window.history.replaceState({}, '', '/game?id=game-id-123&serverId=1');
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: {
          ...baseGame,
          players: [{...baseGame.players[0], botTakeoverToken: 'owner token'}],
        },
      },
    });

    expect(wrapper.vm.getHref('p-blue')).to.eq('player?id=p-blue#botTakeoverToken=owner%20token');
    expect(wrapper.vm.getHref('unknown-player')).to.eq('player?id=unknown-player');
    expect(wrapper.vm.getHref('p-blue')).not.contain('serverId');
  });
});
