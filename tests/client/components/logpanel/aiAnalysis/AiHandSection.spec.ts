import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '@tests/client/components/getLocalVue';
import AiHandSection from '@/client/components/logpanel/aiAnalysis/AiHandSection.vue';

describe('AiHandSection', () => {
  it('hides the hand while the reader still buys their own cards', () => {
    const wrapper = shallowMount(AiHandSection, {...globalConfig, props: {hand: {cards: [], hidden: true}}});
    expect(wrapper.text()).to.include('Visible once you have bought your cards');
  });

  it('shows the cards of an open hand', () => {
    const hand = {cards: [{name: 'Algae'} as any, {name: 'Ants'} as any], hidden: false};
    const wrapper = shallowMount(AiHandSection, {...globalConfig, props: {hand}});
    expect(wrapper.findAll('.cardbox')).to.have.length(2);
  });
});
