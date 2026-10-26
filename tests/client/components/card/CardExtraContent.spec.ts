import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardExtraContent from '@/client/components/card/CardExtraContent.vue';
import {CardName} from '@/common/cards/CardName';
import {CardRenderItemType} from '@/common/cards/render/CardRenderItemType';

describe('CardExtraContent', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(CardExtraContent, {
      ...globalConfig,
      props: {
        card: {
          name: CardName.ECOLINE,
        },
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('does not render the InSpire resources strip when there is nothing stored', () => {
    const wrapper = shallowMount(CardExtraContent, {
      ...globalConfig,
      props: {
        card: {
          name: CardName.IN_SPIRE,
          inSpireResources: [],
        },
      },
    });
    expect(wrapper.find('.in-spire-resources').exists()).to.be.false;
  });

  it('renders one item per stored resource on InSpire', () => {
    const wrapper = shallowMount(CardExtraContent, {
      ...globalConfig,
      props: {
        card: {
          name: CardName.IN_SPIRE,
          inSpireResources: [
            {is: 'item', type: CardRenderItemType.STEEL, amount: 1},
            {is: 'item', type: CardRenderItemType.TITANIUM, amount: 2},
          ],
        },
      },
    });
    expect(wrapper.find('.in-spire-resources').exists()).to.be.true;
    expect(wrapper.findAllComponents({name: 'CardRenderItemComponent'})).has.lengthOf(2);
  });
});
