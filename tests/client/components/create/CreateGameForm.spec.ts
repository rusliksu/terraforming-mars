import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';

describe('CreateGameForm', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
    expect(wrapper.text()).to.contain('/start');
  });

  it('blocks invalid telegram ids during serialization', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].telegramID = '@bad-id';

    let alertMessage = '';
    const originalAlert = window.alert;
    window.alert = ((message?: string) => {
      alertMessage = String(message ?? '');
    }) as typeof window.alert;

    try {
      const serialized = await vm.serializeSettings();
      expect(serialized).to.eq(undefined);
      expect(alertMessage).to.contain('invalid Telegram ID');
    } finally {
      window.alert = originalAlert;
    }
  });

  it('trims valid telegram ids before serialization', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].telegramID = ' 123456789 ';

    const serialized = await vm.serializeSettings();
    expect(serialized).to.be.a('string');
    const payload = JSON.parse(serialized);
    expect(payload.players[0].telegramID).to.eq('123456789');
  });
});
