import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import {GENUINE_GOLD_NAME} from '@/common/Color';

describe('CreateGameForm', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('locks the gold player name to GenuineGold', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].color = 'gold';
    vm.players[0].name = 'Ilya';
    expect(vm.isPlayerNameLocked('gold')).to.eq(true);

    const serialized = await vm.serializeSettings();
    expect(serialized).to.be.a('string');
    const payload = JSON.parse(serialized);
    expect(payload.players[0].name).to.eq(GENUINE_GOLD_NAME);
    expect(vm.players[0].name).to.eq(GENUINE_GOLD_NAME);
  });

  it('treats gold as a locked player identity with gold styling hooks', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].name = 'Ilya';
    vm.players[0].color = 'gold';
    vm.syncLockedPlayerIdentity(vm.players[0]);
    expect(wrapper.find('.create-game-player-name').exists()).to.eq(true);
    expect(vm.players[0].name).to.eq(GENUINE_GOLD_NAME);
    expect(vm.isPlayerNameLocked('gold')).to.eq(true);
    expect(vm.getPlayerContainerColorClass('gold')).to.eq('player_translucent_bg_color_gold');
    expect(vm.getPlayerCubeColorClass('gold')).to.eq('player_bg_color_gold');
  });

  it('posts GenuineGold in createGame payload for gold player', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    let body: string | undefined;
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = (_url: string, options: {body?: string}) => {
      body = options.body;
      return new Promise(() => {});
    };
    try {
      vm.players[0].name = 'Ilya';
      vm.players[0].color = 'gold';
      await vm.createGame();
      expect(body).to.be.a('string');
      const payload = JSON.parse(body as string);
      expect(payload.players[0].color).to.eq('gold');
      expect(payload.players[0].name).to.eq(GENUINE_GOLD_NAME);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
