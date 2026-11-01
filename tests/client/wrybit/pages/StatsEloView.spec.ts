import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import StatsEloView from '@/client/wrybit/pages/stats/StatsEloView.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

const ratings = [
  {displayName: 'Alice', elo: 1600, games: 10, wins: 4, top3: 8, averageVictoryPoints: 91.5},
  {displayName: 'Bob', elo: 1500, games: 8, wins: 2, top3: 5},
];

describe('Wrybit stats ELO rating', () => {
  it('lists the public rating table, strongest first', () => {
    const wrapper = mount(StatsEloView, {...globalConfig, props: {ratings}});
    try {
      const rows = wrapper.findAll('tbody tr');
      expect(rows.length).eq(2);
      expect(rows[0].text()).contains('Alice');
      expect(rows[0].text()).contains('1600');
      expect(rows[0].text()).contains('91.5');
      expect(rows[1].text()).contains('Bob');
      // A player without an average keeps the row readable instead of showing NaN
      expect(rows[1].text()).contains('–');
    } finally {
      wrapper.unmount();
    }
  });
});
