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

  it('adds one-step undo to the main action radio options and routes it to the step reset', () => {
    const wrapper = mountWaitingFor({
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'PlayerInputFactory': {template: '<div class="stub-pif"></div>'},
        },
      },
      props: {
        playerView: {
          ...playerView,
          canStepBack: true,
          thisPlayer: {...thisPlayer, isActive: true},
          game: {...playerView.game, gameOptions: {undoOption: true, undoStepOption: true}},
        } as PlayerViewModel,
        waitingfor: {
          type: 'or',
          title: 'Take your next action',
          buttonLabel: 'Take action',
          options: [
            {type: 'option', title: 'Play project card', buttonLabel: 'Play'},
            {type: 'option', title: 'Undo last action', buttonLabel: 'Undo'},
          ],
        },
      },
    });
    const requests: Array<string> = [];
    wrapper.vm.fetchPlayerInput = ((url: string) => requests.push(url)) as typeof wrapper.vm.fetchPlayerInput;

    const options = (wrapper.vm as any).playerinputWithStepBack().options;
    expect(options.map((option: any) => option.title)).deep.eq([
      'Play project card',
      'Undo last action',
      'Undo one step (experimental)',
    ]);

    (wrapper.vm as any).onsavePlayerInput({type: 'or', index: 2, response: {type: 'option'}});
    expect(requests).deep.eq(['reset?id=p-player-id&mode=step']);
  });

  it('retries step undo after confirming the hidden-information warning', async () => {
    const originalFetch = global.fetch;
    const originalConfirm = window.confirm;
    const requests: Array<string> = [];
    (window as any).confirm = () => true;
    (global as any).fetch = (url: string) => {
      requests.push(url);
      if (requests.length === 1) {
        return Promise.resolve({
          ok: false,
          status: 400,
          clone: () => ({
            json: () => Promise.resolve({
              id: '#undo-revealed-hidden-information',
              message: 'Hidden information warning',
            }),
          }),
        });
      }
      return new Promise(() => {});
    };

    try {
      const wrapper = mountWaitingFor({
        ...globalConfig,
        global: {
          ...globalConfig.global,
          stubs: {
            'PlayerInputFactory': true,
            'AppButton': true,
          },
        },
        props: {
          playerView: playerView as PlayerViewModel,
          waitingfor: {
            type: 'option',
            title: 'test',
            buttonLabel: 'save',
          },
        },
      });

      wrapper.vm.stepBack();
      await new Promise((resolve) => window.setTimeout(resolve, 10));

      expect(requests).deep.eq([
        'reset?id=p-player-id&mode=step',
        'reset?id=p-player-id&mode=step&confirmHiddenInformation=true',
      ]);
    } finally {
      (global as any).fetch = originalFetch;
      (window as any).confirm = originalConfirm;
    }
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
