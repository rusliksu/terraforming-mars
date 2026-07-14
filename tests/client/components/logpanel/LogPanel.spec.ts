import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import {fakePublicPlayerModel, fakeViewModel} from '../testHelpers';
import {Phase} from '@/common/Phase';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {LogMessageType} from '@/common/logs/LogMessageType';

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

  it('keeps player-scoped logs on a finished player page', async () => {
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
    expect(fetchCalls[0]).includes('id=p-blue-id');
    expect(fetchCalls[0]).does.not.include('id=s-spectatorid');
  });

  it('includes the current player\'s private draft logs in their filter without requesting another view', async () => {
    const blue = fakePublicPlayerModel({color: 'blue', id: 'p-blue-id' as any, name: 'Blue'});
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel({players: [blue, fakePublicPlayerModel({color: 'red', name: 'Red'})]}),
        color: 'blue',
      },
    });
    const generation = new LogMessage(LogMessageType.NEW_GENERATION, 'Generation ${0}', []);
    const blueMessage = new LogMessage(LogMessageType.DEFAULT, '${0} played a card', [
      {type: LogMessageDataType.PLAYER, value: 'blue'},
    ]);
    const ownDraftMessage = new LogMessage(LogMessageType.DEFAULT, 'You drafted cards', [], 'p-blue-id' as any);
    (wrapper.vm as any).messages = [generation, blueMessage, ownDraftMessage];

    await wrapper.find('[data-test="log-player-filter-blue"]').trigger('click');

    expect((wrapper.vm as any).filteredMessages).deep.eq([generation, blueMessage, ownDraftMessage]);
    expect(fetchCalls).has.length(1);
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

  it('preserves scroll position on live refresh when user scrolled away from bottom', async () => {
    const fakeList = {} as HTMLUListElement;
    let fakeScrollTop = 0;
    const fakePanel = {
      get scrollTop() {
        return fakeScrollTop;
      },
      set scrollTop(value: number) {
        fakeScrollTop = value;
      },
      scrollHeight: 520,
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

    const viewModel = fakeViewModel();
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel,
        color: 'blue',
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    fakePanel.scrollTop = 120;
    expect((wrapper.vm as any).isNearBottom()).to.equal(false);

    await wrapper.setProps({
      viewModel: {
        ...viewModel,
        game: {
          ...viewModel.game,
          gameAge: 1,
        },
      },
    });
    // Browsers can report a temporary bottom scroll position while replacing the list.
    fakePanel.scrollTop = 320;
    (wrapper.vm as any).handleScroll();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    lastResizeCallback?.([], {});

    expect(fakeScrollTop).to.equal(120);
  });
});
