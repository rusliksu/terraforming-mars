import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import {fakePublicPlayerModel, fakeViewModel} from '../testHelpers';
import {Phase} from '@/common/Phase';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {LogMessageType} from '@/common/logs/LogMessageType';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import LogGenerationList from '@/client/components/logpanel/LogGenerationList.vue';

type TestResizeObserverCallback = (entries: Array<unknown>, observer: unknown) => void;

describe('LogPanel', () => {
  let originalFetch: any;
  let fetchCalls: Array<string>;
  let originalResizeObserver: any;
  let lastResizeCallback: TestResizeObserverCallback | undefined;
  let originalGetElementById: typeof document.getElementById;

  function installScrollablePanel() {
    let scrollTop = 0;
    const panel = {
      get scrollTop() {
        return scrollTop;
      },
      set scrollTop(value: number) {
        scrollTop = value;
      },
      scrollHeight: 520,
      clientHeight: 200,
      querySelector: () => ({} as HTMLUListElement),
      addEventListener() {},
      removeEventListener() {},
    } as unknown as HTMLElement;
    document.getElementById = ((id: string) => id === 'logpanel-scrollable' ? panel : null) as typeof document.getElementById;
    return {
      getScrollTop: () => scrollTop,
      setScrollTop: (value: number) => {
        scrollTop = value;
      },
    };
  }

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
    expect(wrapper.findComponent(LogGenerationList).exists()).is.true;
    expect((wrapper.vm as any).selectedRecentLimit).eq(100);

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
        generation: 1,
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

  it('emits spaceClicked when a log message emits spaceClicked', async () => {
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel(),
        color: 'blue',
      },
    });
    (wrapper.vm as any).messages = [new LogMessage(LogMessageType.DEFAULT, 'Space', [])];
    await wrapper.vm.$nextTick();

    wrapper.findComponent(LogMessageComponent).vm.$emit('spaceClicked', '01');

    expect(wrapper.emitted('spaceClicked')).deep.eq([['01']]);
  });

  it('filters visible logs by selected player without requesting another view', async () => {
    const blue = fakePublicPlayerModel({color: 'blue', id: 'p-blue-id' as any, name: 'Blue'});
    const red = fakePublicPlayerModel({color: 'red', id: 'p-red-id' as any, name: 'Red'});
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel({players: [blue, red]}),
        color: 'blue',
      },
    });
    const generation = new LogMessage(LogMessageType.NEW_GENERATION, 'Generation ${0}', []);
    const blueMessage = new LogMessage(LogMessageType.DEFAULT, '${0} played a card', [
      {type: LogMessageDataType.PLAYER, value: 'blue'},
    ]);
    const redMessage = new LogMessage(LogMessageType.DEFAULT, 'You selected cards', [], 'p-red-id' as any);
    (wrapper.vm as any).messages = [generation, blueMessage, redMessage];

    await wrapper.find('[data-test="log-player-filter-red"]').trigger('click');

    expect((wrapper.vm as any).filteredMessages).deep.eq([generation, redMessage]);
    expect(fetchCalls).has.length(1);
  });

  it('colors each player filter with that player\'s color', async () => {
    const blue = fakePublicPlayerModel({color: 'blue', id: 'p-blue-id' as any, name: 'Blue'});
    const red = fakePublicPlayerModel({color: 'red', id: 'p-red-id' as any, name: 'Red'});
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel({players: [blue, red]}),
        color: 'blue',
      },
    });

    expect(wrapper.find('[data-test="log-player-filter-blue"]').classes()).contains('player_bg_color_blue');
    expect(wrapper.find('[data-test="log-player-filter-red"]').classes()).contains('player_bg_color_red');
    expect(wrapper.find('[data-test="log-player-filter-all"]').classes()).does.not.contain('player_bg_color_blue');
    expect(wrapper.find('.log-panel').element.nextElementSibling).eq(wrapper.find('.log-player-filters').element);
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

  it('restores the log view after the panel is remounted', async () => {
    const panel = installScrollablePanel();

    const blue = fakePublicPlayerModel({color: 'blue', id: 'p-remount-id' as any, name: 'Blue'});
    const red = fakePublicPlayerModel({color: 'red', id: 'p-red-id' as any, name: 'Red'});
    const baseViewModel = fakeViewModel({id: 'p-remount-id' as any, players: [blue, red]});
    const viewModel = {...baseViewModel, game: {...baseViewModel.game, generation: 3}};
    const first = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel, color: 'blue'},
    });

    await Promise.resolve();
    (first.vm as any).selectedGeneration = 1;
    (first.vm as any).selectedRecentLimit = undefined;
    (first.vm as any).selectedPlayerColor = 'red';
    (first.vm as any).stickToBottom = false;
    panel.setScrollTop(120);
    first.unmount();

    const second = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel, color: 'blue'},
    });
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await second.vm.$nextTick();

    expect((second.vm as any).selectedGeneration).eq(1);
    expect((second.vm as any).selectedRecentLimit).eq(undefined);
    expect((second.vm as any).selectedPlayerColor).eq('red');
    expect((second.vm as any).stickToBottom).eq(false);
    expect(panel.getScrollTop()).eq(120);
    expect(fetchCalls[fetchCalls.length - 1]).includes('generation=1');
  });

  it('returns to the latest unfiltered logs on demand', async () => {
    const panel = installScrollablePanel();

    const blue = fakePublicPlayerModel({color: 'blue', id: 'p-latest-id' as any, name: 'Blue'});
    const red = fakePublicPlayerModel({color: 'red', id: 'p-red-id' as any, name: 'Red'});
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel({id: 'p-latest-id' as any, players: [blue, red]}),
        color: 'blue',
      },
    });
    await Promise.resolve();
    (wrapper.vm as any).selectedGeneration = 1;
    (wrapper.vm as any).selectedRecentLimit = undefined;
    (wrapper.vm as any).selectedPlayerColor = 'red';
    (wrapper.vm as any).stickToBottom = false;
    panel.setScrollTop(80);

    await wrapper.find('[data-test="log-latest"]').trigger('click');
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).selectedGeneration).eq(-1);
    expect((wrapper.vm as any).selectedRecentLimit).eq(100);
    expect((wrapper.vm as any).selectedPlayerColor).eq(undefined);
    expect((wrapper.vm as any).stickToBottom).eq(true);
    expect(panel.getScrollTop()).eq(520);
    expect(fetchCalls[fetchCalls.length - 1]).includes('limit=100');
  });

  it('shows the scroll button only when away from the bottom', async () => {
    const panel = installScrollablePanel();
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel({id: 'p-scroll-button-id' as any}),
        color: 'blue',
      },
    });
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    panel.setScrollTop(0);
    (wrapper.vm as any).handleScroll();
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).showScrollToBottomButton).is.true;

    panel.setScrollTop(320);
    (wrapper.vm as any).handleScroll();
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).showScrollToBottomButton).is.false;
  });
});
