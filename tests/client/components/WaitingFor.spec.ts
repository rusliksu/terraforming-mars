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

  it('shows cancel action for nested active action prompts when undo is enabled', () => {
    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'player-input-factory': {template: '<div class="stub-pif"></div>'},
          AppButton: {props: ['title'], template: '<button>{{ title }}</button>'},
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
    const wrapper = shallowMount(WaitingFor, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          'player-input-factory': {template: '<div class="stub-pif"></div>'},
          AppButton: {props: ['title'], template: '<button>{{ title }}</button>'},
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
