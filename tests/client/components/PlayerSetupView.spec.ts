import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerSetupView from '@/client/components/PlayerSetupView.vue';
import Milestones from '@/client/components/Milestones.vue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';

describe('PlayerSetupView', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayerSetupView, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel(),
        tileView: 'show',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows milestone scores in setup game details', () => {
    const thisPlayer = fakePublicPlayerModel({color: 'gold', name: 'GenuineGold', tableau: []});
    const otherPlayer = fakePublicPlayerModel({color: 'emerald', name: 'Рав', tableau: []});

    const wrapper = shallowMount(PlayerSetupView, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel({
          thisPlayer,
          players: [thisPlayer, otherPlayer],
          game: fakeGameModel({
            milestones: [
              {
                name: 'Builder',
                playerName: undefined,
                color: undefined,
                scores: [{color: 'gold', score: 8}],
              },
            ],
            awards: [],
          }),
        }),
        tileView: 'show',
      },
    });

    expect(wrapper.getComponent(Milestones).props('showScores')).to.eq(true);
  });
});
