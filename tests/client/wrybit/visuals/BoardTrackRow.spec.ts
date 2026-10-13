import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import BoardTrackRow from '@/client/wrybit/visuals/trackBonus/BoardTrackRow.vue';
import {LaneEntry} from '@/client/wrybit/visuals/trackBonus/trackBonus';

describe('Wrybit track presentation', () => {
  it('renders supplied track states and bonus ownership and refreshes completed bonuses', async () => {
    const bonuses: Record<number, ReadonlyArray<LaneEntry>> = {
      1: [
        {kind: 'everyone', bonus: {icons: ['resources/card.png'], count: 2}},
        {kind: 'own', bonus: {icons: ['resources/heat.png'], production: true}},
      ],
    };
    const wrapper = mount(BoardTrackRow, {
      props: {
        name: 'Synthetic track',
        cells: [{label: '0', state: 'past'}, {label: '1', state: 'at', reward: true}, {label: '2', state: 'blocked'}],
        bonuses,
      },
      slots: {value: '1', sub: '3'},
    });
    try {
      expect(wrapper.get('.board-track-row__name').text()).eq('Synthetic track');
      expect(wrapper.get('.board-track-row__cell--at').text()).eq('1');
      expect(wrapper.get('.board-track-row__cell--blocked').text()).eq('2');
      expect(wrapper.findAll('.track-lane__cell')).has.length(3);
      expect(wrapper.get('.track-bonus-pin__row').find('.track-bonus-chip--own').exists()).is.true;
      expect(wrapper.get('.track-bonus-chip--everyone b').text()).eq('2');
      expect(wrapper.get('.track-bonus-chip__production img').attributes('src')).eq('assets/resources/heat.png');
      await wrapper.setProps({bonuses: {1: [{kind: 'done', bonus: {icons: [], victoryPoints: 2}}]}});
      expect(wrapper.find('.track-bonus-pin--done').exists()).is.true;
      expect(wrapper.get('.track-bonus-chip--done .track-bonus-chip__vp').text()).eq('2');
      expect(wrapper.find('.track-bonus-chip--everyone').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
