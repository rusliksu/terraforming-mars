import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import StatsPage from '@/client/wrybit/pages/stats/StatsPage.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

const snapshot = {
  projectionVersion: 1,
  source: 'elo',
  games: [{
    id: 'game-1',
    date: '2026-06-04T05:42:25Z',
    map: 'tharsis',
    generations: 10,
    playerCount: 2,
    durationMinutes: 12,
    results: [
      {displayName: 'Alice', place: 1, victoryPoints: 90, corporation: 'Helion'},
      {displayName: 'Bob', place: 2, victoryPoints: 80, corporation: 'Ecoline'},
    ],
  }],
};

describe('Wrybit StatsPage', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders the public overview and player/corporation rows', async () => {
    global.fetch = (async () => ({ok: true, json: async () => snapshot})) as unknown as typeof fetch;
    const wrapper = mount(StatsPage, {...globalConfig, attachTo: document.body});
    try {
      await flushPromises();
      expect(wrapper.text()).contains('Alice');
      expect(wrapper.text()).contains('Helion');
      expect(wrapper.text()).contains('90');
      expect(wrapper.text()).contains('1 / 1');
    } finally {
      wrapper.unmount();
    }
  });

  it('shows the empty state for a valid empty projection', async () => {
    global.fetch = (async () => ({ok: true, json: async () => ({projectionVersion: 1, source: 'elo', games: []})})) as unknown as typeof fetch;
    const wrapper = mount(StatsPage, {...globalConfig, attachTo: document.body});
    try {
      await flushPromises();
      expect(wrapper.text()).contains('No finished games yet.');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders a retryable error without hiding it behind a browser alert', async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls++;
      return {ok: false};
    }) as unknown as typeof fetch;
    const wrapper = mount(StatsPage, {...globalConfig, attachTo: document.body});
    try {
      await flushPromises();
      expect(wrapper.text()).contains('Could not load the statistics.');
      await wrapper.get('button.btn-primary').trigger('click');
      await flushPromises();
      expect(calls).eq(2);
    } finally {
      wrapper.unmount();
    }
  });
});
