import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import Milestones from '@/client/components/Milestones.vue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';

describe('PlayerHome', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel(),
        settings: raw_settings,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows milestone scores in setup game details', () => {
    const thisPlayer = fakePublicPlayerModel({color: 'gold', name: 'GenuineGold', tableau: []});
    const otherPlayer = fakePublicPlayerModel({color: 'emerald', name: 'Рав', tableau: []});

    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
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
        settings: raw_settings,
      },
    });

    expect(wrapper.getComponent(Milestones).props('showScores')).to.eq(true);
  });
});
