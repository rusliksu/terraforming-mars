import {mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardRowComponent from '@/client/components/card/CardRowComponent.vue';
import {CardRenderItemType} from '@/common/cards/render/CardRenderItemType';
import {ICardRenderItem} from '@/common/cards/render/Types';

describe('CardRowComponent', () => {
  it('renders a string description accepted by ItemType without a runtime prop warning', () => {
    const wrapper = mount(CardRowComponent, {...globalConfig, props: {componentData: 'Public card description'}});
    expect(wrapper.get('.card-description').text()).eq('(Public card description)');
  });

  it('mounts without errors', () => {
    const componentData: ICardRenderItem = {
      is: 'item',
      type: CardRenderItemType.MEGACREDITS,
      amount: 5,
    };
    const wrapper = shallowMount(CardRowComponent, {
      ...globalConfig,
      props: {
        componentData,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });
});
