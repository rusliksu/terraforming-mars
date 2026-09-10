import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import GameHome from '@/client/components/GameHome.vue';
import {fakeGameOptionsModel} from './testHelpers';
import {Phase} from '@/common/Phase';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {asComplete} from './utils/models';

describe('GameHome', () => {
  const baseGame = asComplete<SimpleGameModel>({
    activePlayer: 'blue',
    id: 'game-id-123',
    phase: Phase.ACTION,
    players: [{color: 'blue', id: 'p-blue', isBotControlled: false, isSurrendered: false, name: 'Blue'}],
    spectatorId: undefined,
    gameOptions: fakeGameOptionsModel(),
    lastSoloGeneration: 14,
    expectedPurgeTimeMs: 0,
  });

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

  it('marks a bot-controlled player on the public game page', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {
        game: {
          ...baseGame,
          players: [{...baseGame.players[0], isBotControlled: true}],
        },
      },
    });

    const marker = wrapper.find('.bot-controlled-marker');
    expect(marker.exists()).is.true;
    expect(marker.text()).eq('BOT');
    expect(marker.attributes('aria-label')).eq('This player is controlled by a bot');
  });

  it('keeps player links bare even when the lobby URL has a legacy fragment', () => {
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

    expect(wrapper.vm.getHref('p-blue')).to.eq('player?id=p-blue');
    expect(wrapper.vm.getHref('s-spectator')).to.eq('spectator?id=s-spectator');
    expect(wrapper.vm.getHref('p-blue')).not.contain('serverId');
  });

  it('explains how to enter the game from the lobby', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {game: baseGame},
    });

    const hint = wrapper.find('[data-test="lobby-enter-hint"]');
    expect(hint.exists()).is.true;
    expect(hint.text()).to.contain('How to enter');
    expect(hint.text()).to.contain('Click your name below');

    const enterLink = wrapper.find('[data-test="enter-game-link"]');
    expect(enterLink.exists()).is.true;
    expect(enterLink.attributes('href')).eq('player?id=p-blue');
    expect(enterLink.attributes('title')).eq('Enter the game as this player');
    expect(enterLink.find('.enter-game-hint').text()).eq('Enter game');
  });

  it('hints that the lobby link stays available and how a rematch starts', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {game: baseGame},
    });

    const recreate = wrapper.find('.game-home-recreate');
    expect(recreate.text()).to.contain('Recreate game (same setup)');
    expect(recreate.text()).to.contain('Opens a new lobby with the same settings');
  });

  it('keeps player links bare when the lobby has no capability fragment', () => {
    const wrapper = shallowMount(GameHome, {
      ...globalConfig,
      props: {game: baseGame},
    });

    expect(wrapper.vm.getHref('p-blue')).to.eq('player?id=p-blue');
  });
});
