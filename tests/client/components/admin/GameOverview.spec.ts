import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import GameOverview from '@/client/components/admin/GameOverview.vue';
import {fakeGameOptionsModel} from '../testHelpers';
import {Phase} from '@/common/Phase';

describe('GameOverview', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(GameOverview, {
      ...globalConfig,
      props: {
        status: 'loading',
        game: {
          activePlayer: 'black',
          botPlayers: [],
          gameOptions: fakeGameOptionsModel(),
          id: 'g123456789abc',
          lastSoloGeneration: 14,
          phase: Phase.ACTION,
          players: [{color: 'black', id: 'p-black-id', name: 'player-black'}],
          spectatorId: undefined,
          expectedPurgeTimeMs: 0,
        },
        id: 'game-123',
        serverIdOverride: '1',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('does not expose bot takeover controls', () => {
    const wrapper = shallowMount(GameOverview, {
      ...globalConfig,
      props: {
        status: 'done',
        game: {
          activePlayer: 'black',
          botPlayers: ['p-black-id'],
          gameOptions: fakeGameOptionsModel(),
          id: 'g123456789abc',
          lastSoloGeneration: 14,
          phase: Phase.ACTION,
          players: [{color: 'black', id: 'p-black-id', name: 'player-black'}],
          spectatorId: undefined,
          expectedPurgeTimeMs: 0,
        },
        id: 'g123456789abc',
        serverIdOverride: '1',
      },
    });
    expect(wrapper.findAll('button')).has.length(0);
  });
});
