import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import GamesOverview from '@/client/wrybit/pages/GamesOverview.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit GamesOverview', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders the empty state when the native games endpoint returns no entries', async () => {
    global.fetch = (async () => ({ok: true, json: async () => []})) as unknown as typeof fetch;
    const wrapper = mount(GamesOverview, {...globalConfig, attachTo: document.body});
    try {
      await flushPromises();
      expect(wrapper.text()).contains('No games yet.');
      expect(wrapper.find('.games-overview-table').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('renders a retryable error instead of an alert when the list request fails', async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls++;
      return {ok: false, statusText: 'stubbed'};
    }) as unknown as typeof fetch;
    const wrapper = mount(GamesOverview, {...globalConfig, attachTo: document.body});
    try {
      await flushPromises();
      expect(wrapper.text()).contains('The game list could not be loaded.');
      await wrapper.get('button').trigger('click');
      await flushPromises();
      expect(calls).eq(2);
    } finally {
      wrapper.unmount();
    }
  });
});
