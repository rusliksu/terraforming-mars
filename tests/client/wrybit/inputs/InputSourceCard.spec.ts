import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import CardIntroBlock from '@/client/wrybit/inputs/CardIntroBlock.vue';
import {inputSourceCard} from '@/client/wrybit/inputs/inputSourceCard';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {CardName} from '@/common/cards/CardName';

describe('source input card explanation with our catalogue', () => {
  it('recognizes the native named-card prompt, shows our card and omits the redundant generic question', () => {
    const input = {type: 'option', title: 'Select an option for Olympus Conference', buttonLabel: 'Confirm'} as const;
    expect(inputSourceCard(input)).eq(CardName.OLYMPUS_CONFERENCE);
    const wrapper = mount(CardIntroBlock, {...globalConfig, props: {card: CardName.OLYMPUS_CONFERENCE, title: input.title}});
    try {
      expect(wrapper.get('.card-intro-name').text()).eq('Olympus Conference');
      expect(wrapper.find('.wrybit-card').exists()).is.true;
      expect(wrapper.find('.card-intro-question').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('falls back for unknown names and ambiguous amount titles without native display context', () => {
    expect(inputSourceCard({type: 'option', title: 'Select an option for Unknown prototype', buttonLabel: 'Confirm'})).is.undefined;
    expect(inputSourceCard({type: 'amount', title: 'Select amount of energy to spend', buttonLabel: 'Spend', min: 1, max: 4, maxByDefault: false})).is.undefined;
  });
});
