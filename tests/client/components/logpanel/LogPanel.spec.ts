import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import {fakeViewModel} from '../testHelpers';
import {Phase} from '@/common/Phase';

type TestResizeObserverCallback = (entries: Array<unknown>, observer: unknown) => void;

describe('LogPanel', () => {
  let originalFetch: any;
  let fetchCalls: Array<string>;
  let originalResizeObserver: any;
  let lastResizeCallback: TestResizeObserverCallback | undefined;
  let originalGetElementById: typeof document.getElementById;

  beforeEach(() => {
    originalFetch = (global as any).fetch;
    originalResizeObserver = (global as any).ResizeObserver;
    originalGetElementById = document.getElementById.bind(document);
    fetchCalls = [];
    (global as any).fetch = (url: string) => {
      fetchCalls.push(url);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    };
    lastResizeCallback = undefined;
    (global as any).ResizeObserver = class {
      callback: TestResizeObserverCallback;
      constructor(callback: TestResizeObserverCallback) {
        this.callback = callback;
        lastResizeCallback = callback;
      }
      observe() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    (global as any).ResizeObserver = originalResizeObserver;
    document.getElementById = originalGetElementById;
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
    expect(fetchCalls[0]).includes('limit=100');

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

  it('shows one recent-log tab and loads the last 100 logs', async () => {
    const viewModel = fakeViewModel();
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel,
        color: 'blue',
      },
    });

    await Promise.resolve();
    const recentTabs = wrapper.findAll('.log-recent-indicator');
    expect(recentTabs).has.length(1);
    expect(recentTabs[0].text()).eq('Last 100');
    expect(recentTabs[0].classes()).contains('log-recent-indicator--selected');

    (wrapper.vm as any).selectRecentLogs();
    await Promise.resolve();

    expect(fetchCalls).has.length(1);
    expect(fetchCalls[0]).includes('limit=100');
    expect(fetchCalls[0]).does.not.include('generation=');
  });

  it('loads finished game logs through the spectator id', async () => {
    const viewModel = fakeViewModel({
      id: 'p-blue-id' as any,
      game: {
        phase: Phase.END,
        spectatorId: 's-spectatorid' as any,
      },
    });
    shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel,
        color: 'blue',
      },
    });

    await Promise.resolve();

    expect(fetchCalls).has.length(1);
    expect(fetchCalls[0]).includes('id=s-spectatorid');
    expect(fetchCalls[0]).does.not.include('id=p-blue-id');
  });

  it('sticks to bottom when the log list grows after render', async () => {
    const fakeList = {} as HTMLUListElement;
    let fakeScrollHeight = 480;
    const fakePanel = {
      scrollTop: 0,
      get scrollHeight() {
        return fakeScrollHeight;
      },
      clientHeight: 200,
      querySelector: () => fakeList,
      addEventListener() {},
      removeEventListener() {},
    } as unknown as HTMLElement;
    document.getElementById = ((id: string) => {
      if (id === 'logpanel-scrollable') {
        return fakePanel;
      }
      return null;
    }) as typeof document.getElementById;

    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel(),
        color: 'blue',
      },
    });

    await Promise.resolve();
    (wrapper.vm as any).stickToBottom = true;
    (wrapper.vm as any).installAutoScrollObserver();
    expect(lastResizeCallback).to.not.equal(undefined);

    fakeScrollHeight = 640;
    lastResizeCallback?.([], {});

    expect(fakePanel.scrollTop).to.equal(640);
  });

  it('does not jump to bottom when live logs refresh while scrolled up', async () => {
    const fakeList = {} as HTMLUListElement;
    const fakePanel = {
      scrollTop: 100,
      scrollHeight: 900,
      clientHeight: 200,
      querySelector: () => fakeList,
      addEventListener() {},
      removeEventListener() {},
    } as unknown as HTMLElement;
    document.getElementById = ((id: string) => {
      if (id === 'logpanel-scrollable') {
        return fakePanel;
      }
      return null;
    }) as typeof document.getElementById;

    shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel(),
        color: 'blue',
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(fakePanel.scrollTop).to.equal(100);
  });
});
