import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import {fakeGameModel, fakePlayerViewModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import {Phase} from '@/common/Phase';

describe('PlayerHome', () => {
  let localStorage: FakeLocalStorage;
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  function mountPlayerHome(phase: Phase = Phase.ACTION) {
    return shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel({game: fakeGameModel({gameId: 'game-id-123', phase})}),
        settings: raw_settings,
      },
    });
  }

  async function flushPromises() {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('mounts without errors', () => {
    expect(mountPlayerHome().exists()).to.be.true;
  });

  it('does not render bot takeover control for a bare player URL', () => {
    const wrapper = mountPlayerHome();
    expect(wrapper.find('[data-test="bot-takeover-control"]').exists()).is.false;
  });

  it('does not render bot takeover control after the game ends', () => {
    window.history.replaceState({}, '', '/player?id=p-blue-id#botTakeoverToken=owner-token');
    const wrapper = mountPlayerHome(Phase.END);
    expect(wrapper.find('[data-test="bot-takeover-control"]').exists()).is.false;
  });

  it('sends the capability header from a fragment player URL', async () => {
    const calls: Array<{url: string, init?: Parameters<typeof fetch>[1]}> = [];
    global.fetch = async (input, init) => {
      const url = String(input);
      calls.push({url, init});
      const isPost = init?.method === 'POST';
      return {
        ok: true,
        json: async () => ({botPlayers: isPost && url.includes('action=start') ? ['p-blue-id'] : []}),
        text: async () => '',
      } as Response;
    };
    window.history.replaceState({}, '', '/player?id=p-blue-id#botTakeoverToken=owner%20token');

    const wrapper = mountPlayerHome();
    await flushPromises();
    const control = wrapper.get('[data-test="bot-takeover-control"]');
    expect(control.attributes('aria-checked')).eq('false');

    await control.trigger('click');
    await flushPromises();

    const post = calls.find((call) => call.init?.method === 'POST');
    expect(post?.url).eq('api/bot-takeover?action=start&gameId=game-id-123&playerId=p-blue-id');
    expect(post?.init?.headers).deep.eq({'X-Bot-Takeover-Token': 'owner token'});
    expect(control.attributes('aria-checked')).eq('true');

    await control.trigger('click');
    await flushPromises();
    const posts = calls.filter((call) => call.init?.method === 'POST');
    expect(posts[1].url).contains('action=stop');
    expect(posts[1].init?.headers).deep.eq({'X-Bot-Takeover-Token': 'owner token'});
    expect(control.attributes('aria-checked')).eq('false');
  });
});
