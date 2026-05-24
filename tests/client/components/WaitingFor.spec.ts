import {shallowMount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import WaitingFor from '@/client/components/WaitingFor.vue';
import {RecursivePartial} from '@/common/utils/utils';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {Phase} from '@/common/Phase';
import raw_settings from '@/genfiles/settings.json';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {fakePlayerViewModel} from './testHelpers';

describe('WaitingFor', () => {
  type TestNotificationOptions = {
    body?: string;
    icon?: string;
  };
  type TestNotificationPermission = 'default' | 'denied' | 'granted';

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

  let originalFetch: typeof fetch;
  let originalUrl: string;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalUrl = window.location.href;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', originalUrl);
    PreferencesManager.resetForTest();
    delete (global as any).Notification;
    delete (window as any).Notification;
  });

  it('renders player-input-factory when waitingfor is provided', () => {
    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'player-input-factory': {template: '<div class="stub-pif"></div>'},
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
    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'player-input-factory': true,
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

  it('shows a clearer pause-updates label in experimental UI', () => {
    PreferencesManager.INSTANCE.set('experimental_ui', true);

    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'player-input-factory': {template: '<div class="stub-pif"></div>'},
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
  });

  it('passes the player password when submitting input', async () => {
    window.history.replaceState({}, '', '/player?id=p-player-id&password=secret-password');
    const urls: Array<string> = [];
    global.fetch = async (url: unknown) => {
      urls.push(String(url));
      return {
        ok: true,
        json: async () => fakePlayerViewModel(),
      } as Response;
    };

    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'player-input-factory': true,
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

    wrapper.vm.onsave({type: 'option'} as any);
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(urls).deep.eq(['player/input?id=p-player-id&password=secret-password']);
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

    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'player-input-factory': true,
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
});
