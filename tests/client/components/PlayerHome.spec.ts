import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import {Phase} from '@/common/Phase';
import StackedCards from '@/client/components/StackedCards.vue';
import {CardModel} from '@/common/models/CardModel';

describe('PlayerHome', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  function mountPlayerHome(phase: Phase = Phase.ACTION, playerOverrides = {}, multiplayer = true) {
    const thisPlayer = fakePublicPlayerModel({
      tableau: [{name: 'Copper'}] as any,
      ...playerOverrides,
    });
    const players = multiplayer ? [thisPlayer, fakePublicPlayerModel({id: 'p-red-id' as any, color: 'red', name: 'red'})] : [thisPlayer];
    return shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel({
          game: fakeGameModel({gameId: 'game-id-123', phase}),
          players,
          thisPlayer,
        }),
        settings: raw_settings,
      },
    });
  }

  it('mounts without errors', () => {
    expect(mountPlayerHome().exists()).to.be.true;
  });

  it('does not render standalone surrender or bot takeover controls', () => {
    const wrapper = mountPlayerHome();
    expect(wrapper.find('[data-test="bot-takeover-control"]').exists()).is.false;
    expect(wrapper.find('[data-test="surrender-control"]').exists()).is.false;
  });

  it('files effect and action cards under the active filter and counts what the filters show', () => {
    const wrapper = mountPlayerHome(Phase.ACTION, {
      tableau: [{name: 'Albedo Plants'}, {name: 'Focused Organization'}, {name: 'Micro-Mills'}] as any,
    });

    // No cards in hand, so the first counts belong to the active, automated and event filters.
    const counts = wrapper.findAll('.played-cards-count').map((el) => el.text());
    expect(counts).to.deep.eq(['2', '1', '0']);

    // Albedo Plants only has an effect and Focused Organization only has an action: both are
    // active, and neither may also stay in the automated stack.
    const automatedCards = wrapper.findComponent(StackedCards).props('cards') as Array<CardModel>;
    expect(automatedCards.map((card) => card.name)).to.deep.eq(['Micro-Mills']);
  });
});
