import {flushPromises, mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import {fakeViewModel} from '../testHelpers';
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
});
