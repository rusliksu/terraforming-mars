import {flushPromises, mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import {fakeGameModel, fakePublicPlayerModel, fakeViewModel} from '../testHelpers';
import {Phase} from '@/common/Phase';
import PlayerTimer from '@/client/components/overview/PlayerTimer.vue';

describe('PlayersOverview', () => {
  it('shows a recorded view without fetching current ratings or ticking live timers', async () => {
    const originalFetch = global.fetch;
    const requests: Array<string> = [];
    global.fetch = (async (url) => {
      requests.push(String(url));
      return {ok: false};
    }) as typeof fetch;
    try {
      const view = fakeViewModel({thisPlayer: undefined});
      view.game.phase = Phase.END;
      view.game.gameOptions.showTimers = true;
      const wrapper = mount(PlayersOverview, {
        global: {...globalConfig.global, mocks: {
          getVisibilityState: () => false, setVisibilityState: () => {}, componentsVisibility: {tags_concise: false},
        }},
        props: {playerView: view, readOnly: true},
      });
      await flushPromises();
      expect(requests).deep.eq([]);
      expect(wrapper.getComponent(PlayerTimer).props('live')).eq(false);
      expect(wrapper.find('.player-elo-badge').exists()).eq(false);
      wrapper.unmount();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayersOverview, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakeViewModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('labels the player deciding World Government Terraforming as active', () => {
    // #5187: the stale active player is not the one being waited on.
    const blue = fakePublicPlayerModel({color: 'blue', isActive: true});
    const red = fakePublicPlayerModel({color: 'red'});
    red.timer.running = true;
    const wrapper = shallowMount(PlayersOverview, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakeViewModel({
          game: fakeGameModel({phase: Phase.SOLAR}),
          players: [blue, red],
          thisPlayer: blue,
        }),
      },
    });
    const vm = wrapper.vm as any;
    expect(vm.getActionLabel(blue)).eq('none');
    expect(vm.getActionLabel(red)).eq('active');
  });

  it('keeps normal labels during a temporary Solar phase', () => {
    // World Government Advisor and Terra switch to the Solar phase during the active player's turn.
    const blue = fakePublicPlayerModel({color: 'blue', isActive: true});
    blue.timer.running = true;
    const red = fakePublicPlayerModel({color: 'red'});
    const wrapper = shallowMount(PlayersOverview, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakeViewModel({
          game: fakeGameModel({phase: Phase.SOLAR, passedPlayers: ['red']}),
          players: [blue, red],
          thisPlayer: blue,
        }),
      },
    });
    const vm = wrapper.vm as any;
    expect(vm.getActionLabel(blue)).eq('active');
    expect(vm.getActionLabel(red)).eq('passed');
  });
});
