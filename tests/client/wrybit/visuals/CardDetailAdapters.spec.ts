import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import Requirement from '@/client/wrybit/visuals/card/CardRequirementComponent.vue';
import AdjacencyBonus from '@/client/wrybit/visuals/AdjacencyBonus.vue';
import {CardName} from '@/common/cards/CardName';
import {Resource} from '@/common/Resource';
import {TileType} from '@/common/TileType';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit detail adapters over canonical display data', () => {
  it('keeps our found-life and mining state reactive in the source overlay', async () => {
    const wrapper = mount(Card, {...globalConfig, props: {card: {name: CardName.SEARCH_FOR_LIFE, resources: 0}}});
    try {
      expect(wrapper.find('.found-life').exists()).is.false;
      await wrapper.setProps({card: {name: CardName.SEARCH_FOR_LIFE, resources: 1}});
      expect(wrapper.classes()).contains('card-life-found');
      expect(wrapper.get('.found-life__microbe').attributes('src')).eq('assets/martian.png');
      expect(wrapper.get('.found-life__hint').text()).contains('No further VP possible!');
      await wrapper.setProps({card: {name: CardName.SEARCH_FOR_LIFE, resources: 0, bonusResource: [Resource.STEEL]}});
      expect(wrapper.find('.found-life').exists()).is.false;
      expect(wrapper.find('.mined-steel').exists()).is.true;
    } finally {
      wrapper.unmount();
    }
  });

  it('retains our generation requirement and the source max-label spacing class', () => {
    const wrapper = mount(Requirement, {...globalConfig, props: {requirement: {generation: 6, count: 6, max: true}}});
    try {
      expect(wrapper.get('.card-requirement-max-label').text()).eq('max');
      expect(wrapper.text().replace(/\s+/g, ' ')).contains('Gen 6');
      expect(wrapper.findAll('.card-item-container')).has.length(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses the source adjacency-only icon class for a public Capital tile', () => {
    const wrapper = mount(AdjacencyBonus, {...globalConfig, props: {tileType: TileType.CAPITAL}});
    try {
      expect(wrapper.find('.adjacency-bonus--2mc').exists()).is.true;
      expect(wrapper.find('.board-space-bonus--2mc').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
