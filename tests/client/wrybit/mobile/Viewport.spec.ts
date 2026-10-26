import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import WrybitShell from '@/client/wrybit/shell/WrybitShell.vue';
import {mobileLandscape, mobileLayout} from '@/client/wrybit/visuals/common/mobileLayout';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('optional mobile viewport ownership', () => {
  it('follows width and orientation only while enabled and restores the original document', async () => {
    const queries = new Map<string, MediaQueryList>();
    vi.stubGlobal('matchMedia', (query: string) => {
      const media = new EventTarget();
      Object.assign(media, {media: query, matches: query.includes('max-width')});
      queries.set(query, media as MediaQueryList);
      return media;
    });
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=1200';
    document.head.append(meta);
    const wrapper = mount(WrybitShell, {...globalConfig, props: {screen: 'player-home'}});
    try {
      expect(mobileLayout.value).is.true;
      expect(document.documentElement.classList.contains('tm-mobile')).is.true;
      expect(meta.content).eq('width=device-width, initial-scale=1, viewport-fit=cover');
      for (const [query, media] of queries) {
        Object.assign(media, {matches: query.includes('orientation')});
        media.dispatchEvent(new Event('change'));
      }
      expect(mobileLayout.value).is.false;
      expect(mobileLandscape.value).is.true;
      expect(meta.content).eq('width=1200');
    } finally {
      wrapper.unmount();
      expect(mobileLayout.value).is.false;
      expect(mobileLandscape.value).is.false;
      expect(document.documentElement.classList.contains('tm-mobile')).is.false;
      expect(meta.content).eq('width=1200');
      meta.remove();
      vi.unstubAllGlobals();
    }
  });
});
