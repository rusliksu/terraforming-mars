import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import HandCardsPanel from '@/client/wrybit/visuals/HandCardsPanel.vue';
import {CardName} from '@/common/cards/CardName';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';
import {handSortState, resetHandSort, sortHand} from '@/client/wrybit/visuals/cardfilter/handSort';
import {resetCardFilterState} from '@/client/wrybit/visuals/cardfilter/cardFilterState';
import {ownActiveCards, ownPlayedCardsWithoutActive} from '@/client/wrybit/visuals/cardfilter/handCards';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('Wrybit whole hand panel', () => {
  it('keeps our action and effect preludes in the active group exactly once', () => {
    const view = fakePlayerViewModel({thisPlayer: fakePublicPlayerModel({tableau: [
      {name: CardName.ALBEDO_PLANTS}, {name: CardName.APPLIED_SCIENCE}, {name: CardName.HELION}, {name: CardName.ASTEROID},
    ]})});
    expect(ownActiveCards(view).map((card) => card.name)).has.members([CardName.ALBEDO_PLANTS, CardName.APPLIED_SCIENCE]);
    expect(ownPlayedCardsWithoutActive(view).map((card) => card.name)).deep.eq([CardName.HELION, CardName.ASTEROID]);
    const wrapper = mount(HandCardsPanel, {...globalConfig, props: {playerView: view}});
    try {
      expect(wrapper.get('.hand-cards-panel__section--active').findAll('.wrybit-card')).has.length(2);
      expect(wrapper.get('.hand-cards-panel__section--played').findAll('.wrybit-card')).has.length(2);
    } finally {
      wrapper.unmount();
      resetCardFilterState();
    }
  });
  it('shares sorting across controls, restores manual order with newly drawn cards and follows supplied availability', async () => {
    resetCardFilterState();
    const view = fakePlayerViewModel({id: 'p-filter-one', thisPlayer: fakePublicPlayerModel({tableau: []}),
      cardsInHand: [{name: CardName.BIRDS, calculatedCost: 15}, {name: CardName.ASTEROID, calculatedCost: 7}],
      waitingFor: {type: 'projectCard', cards: [{name: CardName.ASTEROID, calculatedCost: 7}]}});
    CardOrderStorage.updateCardOrder(view.id, {});
    resetHandSort(view.id);
    const wrapper = mount(HandCardsPanel, {...globalConfig, props: {playerView: view}});
    const order = () => wrapper.findAll('.sortable-slot').map((slot) => slot.attributes('data-card-name'));
    try {
      expect(order()).deep.eq([CardName.BIRDS, CardName.ASTEROID]);
      expect(wrapper.get('[data-card-name="Birds"] .wrybit-card').classes()).contains('card-unavailable');
      await wrapper.get('.card-sort__more').trigger('click');
      await wrapper.findAll('.card-sort-menu__row')[0].get('button[title="ascending"]').trigger('click');
      expect(order()).deep.eq([CardName.ASTEROID, CardName.BIRDS]);
      const drawn = {...view, cardsInHand: [...view.cardsInHand, {name: CardName.ANTS}], waitingFor: undefined};
      await wrapper.setProps({playerView: drawn});
      await wrapper.get('.card-sort__manual').trigger('click');
      expect(order()).deep.eq([CardName.BIRDS, CardName.ASTEROID, CardName.ANTS]);
      expect(wrapper.get('[data-card-name="Birds"] .wrybit-card').classes()).not.contains('card-unavailable');
      expect(wrapper.text()).not.contains('Playable now');
      const second = 'p-filter-two';
      resetHandSort(second);
      CardOrderStorage.updateCardOrder(second, {});
      sortHand(second, view.cardsInHand, {key: 'cost', reversed: true});
      expect(handSortState(view.id).sortOrder).eq(undefined);
      expect(handSortState(second).sortOrder).deep.eq({key: 'cost', reversed: true});
      resetHandSort(second);
    } finally {
      wrapper.unmount();
      resetHandSort(view.id);
      resetCardFilterState();
    }
  });
});
