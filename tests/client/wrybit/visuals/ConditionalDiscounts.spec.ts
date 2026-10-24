import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import PlayerTags from '@/client/wrybit/visuals/overview/PlayerTags.vue';
import {fakePublicPlayerModel, fakeViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {CardName} from '@/common/cards/CardName';

describe('Wrybit conditional discount badges', () => {
  it('renders the supplied public amount without recalculating it, then clears the conditional badge on refresh', async () => {
    const player = fakePublicPlayerModel({cardDiscount: 3, tableau: [{name: CardName.CUTTING_EDGE_TECHNOLOGY}],
      conditionalDiscounts: [{source: CardName.CUTTING_EDGE_TECHNOLOGY, amount: 17, condition: 'requirements'}]});
    const wrapper = mount(PlayerTags, {...globalConfig, props: {player, playerView: fakeViewModel({thisPlayer: player})}});
    try {
      expect(wrapper.get('.hand-discount > .megacredits-container').text()).eq('-3*');
      expect(wrapper.get('.discount-list-amount').text()).eq('-17');
      expect(wrapper.get('.discount-list-applies-to').text()).eq('cards with requirements');
      expect(wrapper.vm.all.discount).eq(3);
      await wrapper.setProps({player: {...player, conditionalDiscounts: []}});
      expect(wrapper.get('.hand-discount > .megacredits-container').text()).eq('-3');
      expect(wrapper.find('.discount-list').exists()).is.false;
      await wrapper.setProps({player: {...player, cardDiscount: 0, conditionalDiscounts: undefined}});
      expect(wrapper.find('.hand-discount').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
