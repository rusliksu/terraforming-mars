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

  async function flushLogs(wrapper: ReturnType<typeof shallowMount>) {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
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
      },
    });

    expect(wrapper.find('[data-test="log-player-filter-blue"]').classes()).contains('player_bg_color_blue');
    expect(wrapper.find('[data-test="log-player-filter-red"]').classes()).contains('player_bg_color_red');
    expect(wrapper.find('[data-test="log-player-filter-all"]').classes()).does.not.contain('player_bg_color_blue');
    expect(wrapper.find('.log-panel').element.nextElementSibling).eq(wrapper.find('.log-player-filters').element);
  });

  it('keeps ordinary action messages as separate original rows', async () => {
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: fakeViewModel()},
    });
    const played = new LogMessage(LogMessageType.DEFAULT, 'Blue played a card', []);
    played.actionId = 'one-action';
    played.actionStart = true;
    const gained = new LogMessage(LogMessageType.DEFAULT, 'Blue gained 2 steel', []);
    gained.actionId = 'one-action';
    gained.actionEnd = true;
    await Promise.resolve();
    await Promise.resolve();
    (wrapper.vm as any).messages = [played, gained];
    (wrapper.vm as any).selectedPlayerColor = undefined;
    await wrapper.vm.$nextTick();

    expect(wrapper.findAllComponents(LogMessageComponent)).to.have.length(2);
    expect(wrapper.find('.action-log-row').exists()).to.be.false;
  });

  it('includes the current player\'s private draft logs in their filter without requesting another view', async () => {
    const blue = fakePublicPlayerModel({color: 'blue', id: 'p-blue-id' as any, name: 'Blue'});
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {
        viewModel: fakeViewModel({players: [blue, fakePublicPlayerModel({color: 'red', name: 'Red'})]}),
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
      props: {viewModel},
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
      props: {viewModel},
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

  it('returns to the latest recent logs and the end of the log', async () => {
    const panel = installScrollablePanel();
    const baseViewModel = fakeViewModel({id: 'p-latest-reader' as any});
    const viewModel = {...baseViewModel, game: {...baseViewModel.game, generation: 3}};
    const wrapper = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel},
    });
    await flushLogs(wrapper);

    (wrapper.vm as any).selectedGeneration = 1;
    panel.setScrollTop(80);
    await wrapper.find('[data-test="log-latest"]').trigger('click');
    await flushLogs(wrapper);

    expect((wrapper.vm as any).selectedGeneration).eq(-1);
    expect((wrapper.vm as any).selectedRecentLimit).eq(100);
    expect(fetchCalls[fetchCalls.length - 1]).includes('limit=100');
    expect(panel.getScrollTop()).eq(520);
  });

  // The real app never patches an existing LogPanel's props in place: App.vue forces a
  // full unmount/remount (via a `:key` bump) on every game-state refresh. These tests
  // simulate that by unmounting and mounting a fresh instance, exactly like the app does.
  it('follows the latest recent logs across a remount when previously following', async () => {
    const baseViewModel = fakeViewModel({id: 'p-live-follower' as any});
    const viewModel = {...baseViewModel, game: {...baseViewModel.game, generation: 2}};
    const first = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel},
    });
    await flushLogs(first);
    // Module-level view state can be left behind by earlier tests, so explicitly
    // establish "following" mode rather than relying on the freshly-mounted default.
    (first.vm as any).showLatestLogs();
    await flushLogs(first);
    first.unmount();

    const nextViewModel = {...viewModel, game: {...viewModel.game, generation: 3}};
    const second = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: nextViewModel},
    });
    await flushLogs(second);

    expect((second.vm as any).selectedGeneration).eq(-1);
    expect((second.vm as any).selectedRecentLimit).eq(100);
    expect(fetchCalls[fetchCalls.length - 1]).includes('limit=100');
  });

  it('does not jump generations across a remount after the player navigates away', async () => {
    const baseViewModel = fakeViewModel({id: 'p-history-reader' as any});
    const viewModel = {...baseViewModel, game: {...baseViewModel.game, generation: 3}};
    const first = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel},
    });
    await flushLogs(first);

    (first.vm as any).selectGeneration(1);
    await flushLogs(first);
    first.unmount();
    fetchCalls.length = 0;

    const nextViewModel = {...viewModel, game: {...viewModel.game, generation: 4}};
    const second = shallowMount(LogPanel, {
      ...globalConfig,
      props: {viewModel: nextViewModel},
    });
    await flushLogs(second);

    expect((second.vm as any).selectedGeneration).eq(1);
    expect(fetchCalls[fetchCalls.length - 1]).includes('generation=1');
  });
});
