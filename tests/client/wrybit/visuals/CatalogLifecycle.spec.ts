import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import Catalog from '@/client/wrybit/visuals/cardlist/CardList.vue';
import ClassicCatalog from '@/client/components/cardlist/CardList.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit catalogue navigation lifecycle', () => {
  for (const [name, component] of [['Wrybit', Catalog], ['classic', ClassicCatalog]] as const) {
    it(`stops ${name} URL writes, card loading and timers when leaving the catalogue`, async () => {
      vi.useFakeTimers();
      vi.stubGlobal('matchMedia', () => ({matches: true}));
      const originalHash = window.location.hash;
      window.location.hash = '';
      const wrapper = shallowMount(component, globalConfig);
      try {
        await wrapper.setData({filterText: 'Birds'});
        await vi.advanceTimersByTimeAsync(250);
        expect(decodeURIComponent(window.location.hash)).contains('Birds');
        wrapper.unmount();
        window.location.hash = '#another-screen';
        await vi.advanceTimersByTimeAsync(5000);
        expect(window.location.hash).eq('#another-screen');
        expect(vi.getTimerCount()).eq(0);
      } finally {
        wrapper.unmount();
        window.location.hash = originalHash;
        vi.useRealTimers();
        vi.unstubAllGlobals();
      }
    });
  }
});
