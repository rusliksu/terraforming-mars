import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerSetupView from '@/client/components/PlayerSetupView.vue';
import Milestones from '@/client/components/Milestones.vue';
import {fakeGameModel, fakeGameOptionsModel, fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';

import Board from '@/client/components/Board.vue';
import VenusSurfaceBoard from '@/client/components/venusPhase2/VenusSurfaceBoard.vue';
import HighOrbitMarket from '@/client/components/highOrbit/HighOrbitMarket.vue';
import ConglomeratesTeams from '@/client/components/conglomerates/ConglomeratesTeams.vue';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';

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
  it('shows fan boards, market and teams while selecting initial cards', () => {
    const playerView = fakePlayerViewModel({game: fakeGameModel({
      gameOptions: fakeGameOptionsModel({globalParameters: DEFAULT_GLOBAL_PARAMETERS, customBoardRows: 7}),
      venusPhase2: {spaces: []}, highOrbitMarket: [], conglomerates: {teams: []},
    })});
    const wrapper = shallowMount(PlayerSetupView, {...globalConfig, props: {playerView, tileView: 'show'}});
    expect(wrapper.getComponent(Board).props('customBoardRows')).eq(7);
    expect(wrapper.getComponent(Board).props('globalParameters')).deep.eq(DEFAULT_GLOBAL_PARAMETERS);
    expect(wrapper.findComponent(VenusSurfaceBoard).exists()).is.true;
    expect(wrapper.findComponent(HighOrbitMarket).exists()).is.true;
    expect(wrapper.findComponent(ConglomeratesTeams).exists()).is.true;
  });
});
