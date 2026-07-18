import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import {fakeGameModel, fakeGameOptionsModel, fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import {CardName} from '@/common/cards/CardName';
import {Phase} from '@/common/Phase';

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

  it('shows logs after finishing setup while other players are still drafting', () => {
    const thisPlayer = fakePublicPlayerModel({tableau: [{name: CardName.HELION} as any]});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      props: {
        playerView: fakePlayerViewModel({
          thisPlayer,
          players: [thisPlayer],
          game: fakeGameModel({
            phase: Phase.INITIALDRAFTING,
            gameOptions: fakeGameOptionsModel({initialDraftVariant: true}),
          }),
        }),
      },
    });

    expect(wrapper.findComponent(LogPanel).exists()).to.be.true;
  });
});
