import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import GameMenu from '@/client/wrybit/visuals/gameMenu/GameMenu.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';

describe('Wrybit menu with our preferences', () => {
  it('opens our settings in the isolated portal and disables the optional layout', async () => {
    const storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    PreferencesManager.INSTANCE.set('experimental_layout', true);
    const wrapper = mount(GameMenu, {...globalConfig, attachTo: document.body});
    try {
      await wrapper.get('[data-test="game-menu-button"]').trigger('click');
      await flushPromises();
      const menu = document.body.querySelector('.game-menu-dropdown');
      expect(menu?.closest('.wrybit-overlay-root')).not.eq(null);
      const settings = [...menu!.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Player Settings'));
      settings!.click();
      await flushPromises();
      const input = document.body.querySelector<HTMLInputElement>('[role="dialog"] [data-test="experimental_layout"]');
      expect(input?.checked).is.true;
      expect(input?.closest('.wrybit-overlay-root')).not.eq(null);
      input!.checked = false;
      input!.dispatchEvent(new Event('change', {bubbles: true}));
      await flushPromises();
      expect(PreferencesManager.INSTANCE.values().experimental_layout).is.false;
      expect(storage.getItem('experimental_layout')).eq('0');
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      await flushPromises();
      expect(document.body.querySelector('[role="dialog"]')).eq(null);
    } finally {
      wrapper.unmount();
      expect(document.body.querySelector('.wrybit-overlay-root')).eq(null);
      FakeLocalStorage.deregister(storage);
      PreferencesManager.resetForTest();
    }
  });
});
