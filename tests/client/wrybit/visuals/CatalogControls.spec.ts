import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import CostRange from '@/client/wrybit/visuals/cardlist/CardListCostRange.vue';
import FilterGroup from '@/client/wrybit/visuals/cardlist/CardListFilterGroup.vue';
import Section from '@/client/wrybit/visuals/cardlist/CardListSection.vue';
import Rail from '@/client/wrybit/visuals/cardlist/CardListSectionRail.vue';
import HandCardsTab from '@/client/wrybit/visuals/HandCardsTab.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit catalogue presentation controls', () => {
  it('emits bounded price filters and clears both edge limits without changing supplied props', async () => {
    const wrapper = mount(CostRange, {...globalConfig, props: {highest: 50, costMin: 10, costMax: 30}});
    try {
      const sliders = wrapper.findAll('input');
      await sliders[0].setValue('40');
      expect(wrapper.emitted('update:costMin')?.[0]).deep.eq([30]);
      expect((wrapper.props() as {costMin: number}).costMin).eq(10);
      await sliders[1].setValue('5');
      expect(wrapper.emitted('update:costMax')?.[0]).deep.eq([10]);
      await sliders[0].setValue('0');
      await sliders[1].setValue('50');
      expect(wrapper.emitted('update:costMin')?.[1]).deep.eq([undefined]);
      expect(wrapper.emitted('update:costMax')?.[1]).deep.eq([undefined]);
    } finally {
      wrapper.unmount();
    }
  });

  it('renders supplied counts, active options and reset actions without mutating the selection', async () => {
    const selection = {base: true, customCards: false};
    const wrapper = mount(FilterGroup, {...globalConfig, props: {
      title: 'Expansions', options: [{key: 'base', label: 'Base'}, {key: 'customCards', label: 'Custom Cards'}],
      selection, counts: new Map([['base', 12], ['customCards', 0]]),
    }});
    try {
      const chips = wrapper.findAll('.card-list-chip');
      expect(chips[0].attributes('aria-pressed')).eq('true');
      expect(chips[0].get('.card-list-count').text()).eq('12');
      expect(chips[1].classes()).contains('card-list-chip--empty');
      await chips[1].trigger('click');
      await wrapper.get('.card-list-link').trigger('click');
      expect(wrapper.emitted('toggle')?.[0]).deep.eq(['customCards']);
      expect(wrapper.emitted('reset')).has.length(1);
      expect(selection).deep.eq({base: true, customCards: false});
      await wrapper.setProps({selection: {base: true, customCards: true}});
      expect(wrapper.find('.card-list-link').exists()).is.false;
      expect(wrapper.find('.card-list-chip--selected').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('shows only present section parts and keeps rail and hand-tab actions as view events', async () => {
    const section = mount(Section, {...globalConfig, props: {
      title: 'Projects', count: 3, parts: [{label: 'Active', colorClass: 'blue', count: 3}, {label: 'Event', colorClass: 'red', count: 0}],
    }, slots: {default: 'Visible cards'}});
    const rail = mount(Rail, {...globalConfig, props: {sections: [{title: 'Projects'}, {title: 'Corporations'}], activeIndex: 1}});
    const tab = mount(HandCardsTab, {...globalConfig, props: {count: 0, active: false}});
    try {
      expect(section.findAll('.card-list-section-stripe > span')).has.length(1);
      expect(section.get('.card-list-section-count').text()).eq('3');
      expect(section.get('.card-list-section-body').text()).eq('Visible cards');
      expect(rail.findAll('button')[1].attributes('aria-current')).eq('true');
      await rail.findAll('button')[0].trigger('click');
      expect(rail.emitted('jump')?.[0]).deep.eq(['Projects']);
      expect(tab.get('button').attributes('aria-selected')).eq('false');
      expect(tab.get('button').classes()).contains('or-tab--empty');
      await tab.get('button').trigger('click');
      expect(tab.emitted('select')).has.length(1);
    } finally {
      section.unmount();
      rail.unmount();
      tab.unmount();
    }
  });
});
