import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import {fakeViewModel} from '../testHelpers';

describe('LogPanel', () => {
  let originalFetch: any;
  let fetchCalls: Array<string>;

  beforeEach(() => {
    originalFetch = (global as any).fetch;
    fetchCalls = [];
    (global as any).fetch = (url: string) => {
      fetchCalls.push(url);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    };
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel(),
        color: 'blue',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('refreshes logs when the current generation gameAge changes', async () => {
    const viewModel = fakeViewModel();
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel,
        color: 'blue',
        step: 0,
      },
    });

    await Promise.resolve();
    expect(fetchCalls).has.length(1);
    expect(fetchCalls[0]).includes('gameAge=0');

    const updatedViewModel = {
      ...viewModel,
      game: {
        ...viewModel.game,
        gameAge: 1,
      },
    };

    await wrapper.setProps({viewModel: updatedViewModel, step: 1});
    await Promise.resolve();

    expect(fetchCalls).has.length(2);
    expect(fetchCalls[1]).includes('gameAge=1');
  });
});
