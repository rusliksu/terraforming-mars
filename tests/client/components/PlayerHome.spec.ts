import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import {Phase} from '@/common/Phase';
import {defineComponent, nextTick, onMounted, onUnmounted} from 'vue';

describe('PlayerHome', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
    window.history.replaceState({}, '', '/player?id=p-blue-id');
  });

  function mountPlayerHome(phase: Phase = Phase.ACTION, playerOverrides = {}, multiplayer = true) {
    const thisPlayer = fakePublicPlayerModel({
      tableau: [{name: 'Copper'}] as any,
      ...playerOverrides,
    });
    const players = multiplayer ? [thisPlayer, fakePublicPlayerModel({id: 'p-red-id' as any, color: 'red', name: 'red'})] : [thisPlayer];
    return shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel({
          game: fakeGameModel({gameId: 'game-id-123', phase}),
          players,
          thisPlayer,
        }),
        settings: raw_settings,
        viewRevision: 0,
      },
    });
  }

  it('mounts without errors', () => {
    expect(mountPlayerHome().exists()).to.be.true;
  });

  it('remounts only the action input boundary when a new player view arrives', async () => {
    let cardMounts = 0;
    let cardUnmounts = 0;
    let waitingMounts = 0;
    let waitingUnmounts = 0;
    const CardStub = defineComponent({
      props: {card: {type: Object, required: true}},
      setup() {
        onMounted(() => cardMounts++);
        onUnmounted(() => cardUnmounts++);
      },
      template: '<div class="card-stub"></div>',
    });
    const WaitingForStub = defineComponent({
      setup() {
        onMounted(() => waitingMounts++);
        onUnmounted(() => waitingUnmounts++);
      },
      template: '<div class="waiting-stub"></div>',
    });
    const firstPlayer = fakePublicPlayerModel({tableau: [{name: 'CrediCor'}] as any});
    const firstView = fakePlayerViewModel({thisPlayer: firstPlayer, players: [firstPlayer]});
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {Card: CardStub, WaitingFor: WaitingForStub},
      },
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: firstView,
        settings: raw_settings,
        viewRevision: 0,
      },
    });
    expect(cardMounts).eq(1);
    expect(waitingMounts).eq(1);

    const secondPlayer = fakePublicPlayerModel({tableau: [{name: 'CrediCor'}] as any, megacredits: 42});
    const secondView = fakePlayerViewModel({thisPlayer: secondPlayer, players: [secondPlayer]});
    await wrapper.setProps({playerView: secondView, viewRevision: 1});
    await nextTick();

    expect(cardMounts).eq(1);
    expect(cardUnmounts).eq(0);
    expect(waitingMounts).eq(2);
    expect(waitingUnmounts).eq(1);
    wrapper.unmount();
  });

  it('remounts the setup action boundary when a new player view arrives', async () => {
    let waitingMounts = 0;
    let waitingUnmounts = 0;
    const WaitingForStub = defineComponent({
      setup() {
        onMounted(() => waitingMounts++);
        onUnmounted(() => waitingUnmounts++);
      },
      template: '<div class="waiting-stub"></div>',
    });
    const firstPlayer = fakePublicPlayerModel({tableau: []});
    const firstView = fakePlayerViewModel({
      thisPlayer: firstPlayer,
      players: [firstPlayer],
      waitingFor: {type: 'option', title: 'Pick a corporation', buttonLabel: 'Save'},
    });
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {PlayerSetupView: false, WaitingFor: WaitingForStub},
      },
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: firstView,
        settings: raw_settings,
        viewRevision: 0,
      },
    });
    expect(waitingMounts).eq(1);

    const secondPlayer = fakePublicPlayerModel({tableau: [], megacredits: 42});
    const secondView = fakePlayerViewModel({thisPlayer: secondPlayer, players: [secondPlayer], waitingFor: undefined});
    await wrapper.setProps({playerView: secondView, viewRevision: 1});
    await nextTick();

    expect(waitingMounts).eq(2);
    expect(waitingUnmounts).eq(1);
    wrapper.unmount();
  });

  it('does not render standalone surrender or bot takeover controls', () => {
    const wrapper = mountPlayerHome();
    expect(wrapper.find('[data-test="bot-takeover-control"]').exists()).is.false;
    expect(wrapper.find('[data-test="surrender-control"]').exists()).is.false;
  });
});
