import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import StartScreen from '@/client/components/StartScreen.vue';
import {Phase} from '@/common/Phase';
import {fakeGameOptionsModel} from './testHelpers';

describe('StartScreen', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = (async () => ({
      ok: true,
      json: async () => [],
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(StartScreen, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('links to the local tier list mirror', () => {
    const wrapper = shallowMount(StartScreen, {
      ...globalConfig,
    });
    const tierListLink = wrapper.findAll('a').find((link) => link.text() === 'Tier List');

    expect(tierListLink).is.not.undefined;
    expect(tierListLink?.attributes('href')).to.eq('/tierlist/');
  });

  it('shows live games with spectator links', async () => {
    const fetchCalls: Array<string> = [];
    global.fetch = (async (url: unknown) => {
      fetchCalls.push(String(url));
      return {
        ok: true,
        json: async () => [{
          activePlayer: 'blue',
          expectedPurgeTimeMs: 0,
          id: 'game-live',
          lastSoloGeneration: 14,
          phase: Phase.ACTION,
          players: [
            {color: 'blue', id: 'p-blue', name: 'Blue'},
            {color: 'red', id: 'p-red', name: 'Red'},
          ],
          spectatorId: 's-live',
          gameOptions: fakeGameOptionsModel(),
        }],
      } as unknown as Response;
    }) as typeof fetch;

    const wrapper = shallowMount(StartScreen, {
      ...globalConfig,
    });
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(fetchCalls).deep.eq(['api/live-games']);
    expect(wrapper.text()).to.contain('Current games');
    expect(wrapper.text()).to.contain('Blue');
    expect(wrapper.text()).to.contain('Red');
    const gameLink = wrapper.get('.start-screen-live-game');
    expect(gameLink.attributes('href')).to.eq('spectator?id=s-live');
    expect(gameLink.attributes('aria-label')).to.eq('Spectate game: Blue / Red');
  });
});
