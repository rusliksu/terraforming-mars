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

  async function flushPromises() {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('mounts without errors', () => {
    expect(mountPlayerHome().exists()).to.be.true;
  });

  it('renders surrender in player actions without bot takeover', () => {
    const wrapper = mountPlayerHome();
    expect(wrapper.find('[data-test="bot-takeover-control"]').exists()).is.false;
    expect(wrapper.find('[data-test="surrender-control"]').exists()).is.true;
  });

  it('does not render surrender after the game ends or in solo', () => {
    const wrapper = mountPlayerHome(Phase.END);
    expect(wrapper.find('[data-test="surrender-control"]').exists()).is.false;
    expect(mountPlayerHome(Phase.ACTION, {}, false).find('[data-test="surrender-control"]').exists()).is.false;
  });

  it('does not send surrender when confirmation is cancelled', async () => {
    const calls: Array<{url: string, init?: Parameters<typeof fetch>[1]}> = [];
    global.fetch = async (input, init) => {
      calls.push({url: String(input), init});
      return {
        ok: true,
        json: async () => ({surrenderedPlayers: []}),
        text: async () => '',
      } as Response;
    };
    window.confirm = () => false;

    const wrapper = mountPlayerHome();
    await flushPromises();
    await wrapper.get('[data-test="surrender-control"]').trigger('click');
    await flushPromises();

    expect(calls.some((call) => call.init?.method === 'POST')).is.false;
  });

  it('sends irreversible surrender from the player page', async () => {
    const calls: Array<{url: string, init?: Parameters<typeof fetch>[1]}> = [];
    global.fetch = async (input, init) => {
      const url = String(input);
      calls.push({url, init});
      return {
        ok: true,
        json: async () => ({
          surrenderedPlayers: ['p-blue-id'],
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
    expect(post?.url).eq('api/surrender?playerId=p-blue-id');
    expect(post?.init?.headers).eq(undefined);
    expect(surrender.text()).eq('Surrendered');
  });
});
