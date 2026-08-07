import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import {Phase} from '@/common/Phase';

describe('PlayerHome', () => {
  let localStorage: FakeLocalStorage;
  const originalFetch = global.fetch;
  const originalConfirm = window.confirm;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
    window.confirm = () => true;
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
    global.fetch = originalFetch;
    window.confirm = originalConfirm;
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  function mountPlayerHome(phase: Phase = Phase.ACTION, playerOverrides = {}) {
    const thisPlayer = fakePublicPlayerModel({
      tableau: [{name: 'Copper'}] as any,
      ...playerOverrides,
    });
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
          players: [thisPlayer],
          thisPlayer,
        }),
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

  it('renders player action controls for a bare player URL', () => {
    const wrapper = mountPlayerHome();
    expect(wrapper.find('[data-test="bot-takeover-control"]').exists()).is.true;
    expect(wrapper.find('[data-test="surrender-control"]').exists()).is.true;
  });

  it('does not render bot takeover control after the game ends', () => {
    const wrapper = mountPlayerHome(Phase.END);
    expect(wrapper.find('[data-test="bot-takeover-control"]').exists()).is.false;
  });

  it('sends player-page takeover requests without a shared token header', async () => {
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
    const wrapper = mountPlayerHome();
    await flushPromises();
    const control = wrapper.get('[data-test="bot-takeover-control"]');
    expect(control.attributes('aria-checked')).eq('false');

    await control.trigger('click');
    await flushPromises();

    const post = calls.find((call) => call.init?.method === 'POST');
    expect(post?.url).eq('api/bot-takeover?action=start&gameId=game-id-123&playerId=p-blue-id');
    expect(post?.init?.headers).eq(undefined);
    expect(control.attributes('aria-checked')).eq('true');

    await control.trigger('click');
    await flushPromises();
    const posts = calls.filter((call) => call.init?.method === 'POST');
    expect(posts[1].url).contains('action=stop');
    expect(posts[1].init?.headers).eq(undefined);
    expect(control.attributes('aria-checked')).eq('false');
  });

  it('does not send a mutation when bot takeover confirmation is cancelled', async () => {
    const calls: Array<{url: string, init?: Parameters<typeof fetch>[1]}> = [];
    global.fetch = async (input, init) => {
      calls.push({url: String(input), init});
      return {
        ok: true,
        json: async () => ({botPlayers: []}),
        text: async () => '',
      } as Response;
    };
    window.confirm = () => false;

    const wrapper = mountPlayerHome();
    await flushPromises();
    await wrapper.get('[data-test="bot-takeover-control"]').trigger('click');
    await flushPromises();

    expect(calls.some((call) => call.init?.method === 'POST')).is.false;
  });

  it('sends irreversible surrender separately from bot takeover', async () => {
    const calls: Array<{url: string, init?: Parameters<typeof fetch>[1]}> = [];
    global.fetch = async (input, init) => {
      const url = String(input);
      calls.push({url, init});
      return {
        ok: true,
        json: async () => ({
          botPlayers: [],
          surrenderedPlayers: url.includes('action=surrender') ? ['p-blue-id'] : [],
        }),
        text: async () => '',
      } as Response;
    };

    const wrapper = mountPlayerHome();
    await flushPromises();
    const surrender = wrapper.get('[data-test="surrender-control"]');

    await surrender.trigger('click');
    await flushPromises();

    const post = calls.find((call) => call.init?.method === 'POST');
    expect(post?.url).eq('api/bot-takeover?action=surrender&gameId=game-id-123&playerId=p-blue-id');
    expect(post?.init?.headers).eq(undefined);
    expect(surrender.text()).eq('Surrendered');
  });
});
