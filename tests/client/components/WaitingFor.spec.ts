import {shallowMount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import WaitingFor from '@/client/components/WaitingFor.vue';
import {RecursivePartial} from '@/common/utils/utils';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {Phase} from '@/common/Phase';
import raw_settings from '@/genfiles/settings.json';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

describe('WaitingFor', () => {
  type TestRequestOptions = {body?: unknown};
  type TestNotificationOptions = {
    body?: string;
    icon?: string;
  };
  type TestNotificationPermission = 'default' | 'denied' | 'granted';
  type FakeTimeoutHandler = Parameters<typeof window.setTimeout>[0];
  const wrappers: Array<{unmount: () => void}> = [];

  function mountWaitingFor(options: any) {
    const wrapper = shallowMount(WaitingFor, options);
    wrappers.push(wrapper);
    return wrapper;
  }

  class FakeWaitingForXHR {
    public static requests: Array<FakeWaitingForXHR> = [];

    public onerror: (() => void) | undefined;
    public onload: (() => void) | undefined;
    public response: unknown;
    public responseType = '';
    public status = 0;
    public url = '';

    public open(_method: string, url: string) {
      this.url = url;
    }

    public send() {
      FakeWaitingForXHR.requests.push(this);
    }

    public triggerError() {
      this.onerror?.();
    }

    public triggerLoad(status: number, response: unknown = undefined) {
      this.status = status;
      this.response = response;
      this.onload?.();
    }
  }

  const thisPlayer: Partial<PublicPlayerModel> = {
    color: 'red',
  } as any;

  const playerView: RecursivePartial<PlayerViewModel> = {
    id: 'p-player-id',
    thisPlayer: thisPlayer as PublicPlayerModel,
    players: [thisPlayer as PublicPlayerModel],
    game: {
      phase: Phase.ACTION,
      gameAge: 1,
      undoCount: 0,
    },
  };

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    PreferencesManager.resetForTest();
    delete (global as any).Notification;
    delete (window as any).Notification;
    delete (global as any).XMLHttpRequest;
    delete (window as any).XMLHttpRequest;
    window.history.replaceState({}, '', '/');
  });

  it('renders player-input-factory when waitingfor is provided', () => {
    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
        },
      },
      props: {
        playerView: playerView as PlayerViewModel,
        players: [thisPlayer as PublicPlayerModel],
        waitingfor: {
          type: 'option',
          title: 'test',
          buttonLabel: 'save',
        },
      },
    });
    expect(wrapper.find('.stub-pif').exists()).to.be.true;
    expect(wrapper.text()).to.not.include('Not your turn');
  });

  it('shows "not your turn" when waitingfor is undefined', () => {
    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': true,
        },
      },
      props: {
        playerView: playerView as PlayerViewModel,
        players: [thisPlayer as PublicPlayerModel],
        waitingfor: undefined,
      },
    });
    expect(wrapper.text()).to.include('Not your turn');
  });

  it('shows a clearer pause-updates label in experimental UI', async () => {
    PreferencesManager.INSTANCE.set('experimental_ui', true);

    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
        },
      },
      props: {
        playerView: playerView as PlayerViewModel,
        players: [thisPlayer as PublicPlayerModel],
        settings: raw_settings,
        waitingfor: {
          type: 'option',
          title: 'test',
          buttonLabel: 'save',
        },
      },
    });

    expect(wrapper.text()).to.include('Pause updates');
    expect(wrapper.text()).to.not.include('Suspend');

    await wrapper.setProps({
      playerView: {
        ...playerView,
        thisPlayer: {...thisPlayer, isActive: true},
      } as PlayerViewModel,
    });
    expect(wrapper.text()).to.not.include('Pause updates');
  });

  it('shows cancel action for nested active action prompts when undo is enabled', () => {
    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
          'AppButton': {props: ['title'], template: '<button>{{ title }}</button>'},
        },
      },
      props: {
        playerView: {
          ...playerView,
          thisPlayer: {...thisPlayer, isActive: true},
          game: {
            ...playerView.game,
            gameOptions: {undoOption: true},
          },
        } as PlayerViewModel,
        waitingfor: {
          type: 'card',
          title: 'Choose a card',
          buttonLabel: 'Choose',
          cards: [],
          min: 1,
          max: 1,
        },
      },
    });

    expect(wrapper.text()).to.include('Cancel action');
  });

  it('does not show cancel action on the main action prompt', () => {
    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
          'AppButton': {props: ['title'], template: '<button>{{ title }}</button>'},
        },
      },
      props: {
        playerView: {
          ...playerView,
          thisPlayer: {...thisPlayer, isActive: true},
          game: {
            ...playerView.game,
            gameOptions: {undoOption: true},
          },
        } as PlayerViewModel,
        waitingfor: {
          type: 'or',
          title: 'Take your next action',
          buttonLabel: 'Take action',
          options: [],
        },
      },
    });

    expect(wrapper.text()).to.not.include('Cancel action');
  });

  it('shows an undo action control on the main action prompt when undo is available', async () => {
    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
          'AppButton': {props: ['title'], emits: ['click'], template: '<button @click="$emit(\'click\')">{{ title }}</button>'},
        },
      },
      props: {
        playerView: {
          ...playerView,
          runId: 'run-id',
          thisPlayer: {...thisPlayer, isActive: true},
          game: {
            ...playerView.game,
            gameOptions: {undoOption: true},
          },
        } as PlayerViewModel,
        waitingfor: {
          type: 'or',
          title: 'Take your next action',
          buttonLabel: 'Take action',
          options: [
            {type: 'option', title: 'Pass for now', buttonLabel: 'Pass'},
            {type: 'option', title: 'Undo last action', buttonLabel: 'Undo'},
          ],
        },
      },
    });

    const requests: Array<{url: string, options: TestRequestOptions}> = [];
    wrapper.vm.fetchPlayerInput = ((url: string, options: TestRequestOptions) => {
      requests.push({url, options});
    }) as typeof wrapper.vm.fetchPlayerInput;

    expect(wrapper.text()).to.include('Undo last action');
    expect(wrapper.text()).to.not.include('Cancel action');

    await wrapper.find('button').trigger('click');

    expect(requests).has.length(1);
    expect(requests[0].url).eq('player/input?id=p-player-id');
    expect(JSON.parse(requests[0].options.body as string)).deep.eq({
      runId: 'run-id',
      type: 'or',
      index: 1,
      response: {type: 'option'},
    });
  });

  it('shows cancel action for nested active action option prompts when undo is enabled', () => {
    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
          'AppButton': {props: ['title'], template: '<button>{{ title }}</button>'},
        },
      },
      props: {
        playerView: {
          ...playerView,
          thisPlayer: {...thisPlayer, isActive: true},
          game: {
            ...playerView.game,
            gameOptions: {undoOption: true},
          },
        } as PlayerViewModel,
        waitingfor: {
          type: 'or',
          title: 'Select one option',
          buttonLabel: 'Confirm',
          options: [],
        },
      },
    });

    expect(wrapper.text()).to.include('Cancel action');
  });

  it('shows a notification after permission is granted', async () => {
    PreferencesManager.INSTANCE.set('enable_sounds', false);

    const notifications: Array<{title: string, options: TestNotificationOptions}> = [];
    let permissionRequests = 0;

    class FakeNotification {
      static permission: TestNotificationPermission = 'default';

      constructor(title: string, options: TestNotificationOptions) {
        notifications.push({title, options});
      }

      static async requestPermission(): Promise<TestNotificationPermission> {
        permissionRequests++;
        FakeNotification.permission = 'granted';
        return 'granted';
      }
    }

    (global as any).Notification = FakeNotification;
    (window as any).Notification = FakeNotification;

    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': true,
        },
      },
      props: {
        playerView: playerView as PlayerViewModel,
        players: [thisPlayer as PublicPlayerModel],
        settings: raw_settings,
        waitingfor: {
          type: 'option',
          title: 'test',
          buttonLabel: 'save',
        },
      },
    });

    await wrapper.vm.notify();

    expect(permissionRequests).eq(1);
    expect(notifications).deep.eq([{
      title: 'Terraforming Mars',
      options: {
        icon: 'favicon.ico',
        body: 'It\'s your turn!',
      },
    }]);
  });

  it('retries waiting-for polling after network errors', () => {
    const originalSetTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;
    const originalWarn = console.warn;
    const timeoutHandlers: Array<FakeTimeoutHandler> = [];
    const warnings: Array<unknown> = [];

    (global as any).XMLHttpRequest = FakeWaitingForXHR;
    (window as any).XMLHttpRequest = FakeWaitingForXHR;
    FakeWaitingForXHR.requests = [];
    window.history.replaceState({}, '', '/player?id=p-player-id');
    window.setTimeout = ((handler: FakeTimeoutHandler, timeout?: number) => {
      expect(timeout).eq(raw_settings.waitingForTimeout);
      timeoutHandlers.push(handler);
      return timeoutHandlers.length as unknown as ReturnType<typeof window.setTimeout>;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((timeoutId) => originalClearTimeout(timeoutId)) as typeof window.clearTimeout;
    console.warn = ((...args: Array<unknown>) => warnings.push(args.join(' '))) as typeof console.warn;

    try {
      mountWaitingFor({
        ...globalConfig,
        global: {
          ...globalConfig.global,
          stubs: {
            'PlayerInputFactory': true,
          },
        },
        props: {
          playerView: playerView as PlayerViewModel,
          players: [thisPlayer as PublicPlayerModel],
          waitingfor: undefined,
        },
      });

      expect(timeoutHandlers).has.length(1);
      (timeoutHandlers[0] as () => void)();
      expect(FakeWaitingForXHR.requests).has.length(1);
      expect(FakeWaitingForXHR.requests[0].url).eq('api/waitingfor?id=p-player-id&gameAge=1&undoCount=0');

      FakeWaitingForXHR.requests[0].triggerError();

      expect(timeoutHandlers).has.length(2);
      expect(warnings[0]).contains('Waiting-for poll failed; retrying.');
    } finally {
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
      console.warn = originalWarn;
    }
  });

  it('retries waiting-for polling after transient server responses', () => {
    const originalSetTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;
    const originalWarn = console.warn;
    const timeoutHandlers: Array<FakeTimeoutHandler> = [];
    const warnings: Array<unknown> = [];

    (global as any).XMLHttpRequest = FakeWaitingForXHR;
    (window as any).XMLHttpRequest = FakeWaitingForXHR;
    FakeWaitingForXHR.requests = [];
    window.history.replaceState({}, '', '/player?id=p-player-id');
    window.setTimeout = ((handler: FakeTimeoutHandler, timeout?: number) => {
      expect(timeout).eq(raw_settings.waitingForTimeout);
      timeoutHandlers.push(handler);
      return timeoutHandlers.length as unknown as ReturnType<typeof window.setTimeout>;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((timeoutId) => originalClearTimeout(timeoutId)) as typeof window.clearTimeout;
    console.warn = ((...args: Array<unknown>) => warnings.push(args.join(' '))) as typeof console.warn;

    try {
      mountWaitingFor({
        ...globalConfig,
        global: {
          ...globalConfig.global,
          stubs: {
            'PlayerInputFactory': true,
          },
        },
        props: {
          playerView: playerView as PlayerViewModel,
          players: [thisPlayer as PublicPlayerModel],
          waitingfor: undefined,
        },
      });

      (timeoutHandlers[0] as () => void)();
      FakeWaitingForXHR.requests[0].triggerLoad(500);

      expect(timeoutHandlers).has.length(2);
      expect(warnings[0]).contains('Received unexpected response from server (500).');
    } finally {
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
      console.warn = originalWarn;
    }
  });
});
