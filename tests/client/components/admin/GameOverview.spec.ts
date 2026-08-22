import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import GameOverview from '@/client/components/admin/GameOverview.vue';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {asComplete} from '../utils/models';

describe('GameOverview', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(GameOverview, {
      ...globalConfig,
      props: {
        status: 'loading',
        game: asComplete<SimpleGameModel>({}),
        id: 'game-123',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('does not expose bot takeover controls', () => {
    const wrapper = shallowMount(GameOverview, {
      ...globalConfig,
      props: {
        status: 'done',
        game: asComplete<SimpleGameModel>({
          botPlayers: ['p-black-id'],
        }),
        id: 'g123456789abc',
        serverIdOverride: '1',
      },
    });
    expect(wrapper.findAll('button')).has.length(0);
  });
});
