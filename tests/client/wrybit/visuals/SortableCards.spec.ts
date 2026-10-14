import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import SortableCards from '@/client/wrybit/visuals/SortableCards.vue';
import {CardName} from '@/common/cards/CardName';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit pointer hand sorting', () => {
  const cards = [{name: CardName.BIRDS, calculatedCost: 15}, {name: CardName.HELION}, {name: CardName.ASTEROID, calculatedCost: 7}];
  const options = {...globalConfig, attachTo: document.body, props: {cards, playerId: 'synthetic-wrybit-sort'}};

  it('keeps our sort/storage contract and manual order across remounts', async () => {
    CardOrderStorage.updateCardOrder(options.props.playerId, {});
    const wrapper = mount(SortableCards, options);
    try {
      await wrapper.setProps({sortOrder: {key: 'cost', reversed: false}});
      expect(wrapper.vm.getSortedCards().map((card) => card.name)).deep.eq([CardName.HELION, CardName.ASTEROID, CardName.BIRDS]);
      await wrapper.setData({dragCard: CardName.BIRDS});
      wrapper.vm.moveDraggedCard(CardName.HELION);
      expect(wrapper.emitted('update:sortOrder')).has.length(1);
      expect(CardOrderStorage.getOrdered(CardOrderStorage.getCardOrder(options.props.playerId), cards).map((card) => card.name))
        .deep.eq([CardName.BIRDS, CardName.HELION, CardName.ASTEROID]);
      wrapper.unmount();
      const remounted = mount(SortableCards, options);
      try {
        expect(remounted.vm.getSortedCards().map((card) => card.name)).deep.eq([CardName.BIRDS, CardName.HELION, CardName.ASTEROID]);
      } finally {
        remounted.unmount();
      }
    } finally {
      wrapper.unmount();
    }
  });

  it('cancels a touch hold on scrolling or unmount and cleans the ghost portal after a mouse drag', async () => {
    vi.useFakeTimers();
    const wrapper = mount(SortableCards, options);
    try {
      const slot = wrapper.get('[data-card-name="Birds"]');
      slot.element.dispatchEvent(new PointerEvent('pointerdown', {button: 0, pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10}));
      window.dispatchEvent(new PointerEvent('pointermove', {pointerId: 1, clientX: 30, clientY: 10}));
      await vi.advanceTimersByTimeAsync(350);
      expect(document.querySelector('.sortable-ghost')).eq(null);
      slot.element.dispatchEvent(new PointerEvent('pointerdown', {button: 0, pointerId: 2, pointerType: 'mouse', clientX: 10, clientY: 10}));
      window.dispatchEvent(new PointerEvent('pointermove', {pointerId: 2, clientX: 30, clientY: 10}));
      expect(document.querySelector('.wrybit-overlay-root .sortable-ghost')).not.eq(null);
      wrapper.unmount();
      expect(document.querySelector('.wrybit-overlay-root .sortable-ghost')).eq(null);
      expect(vi.getTimerCount()).eq(0);
      window.dispatchEvent(new PointerEvent('pointermove', {pointerId: 2, clientX: 50, clientY: 10}));
      expect(document.querySelector('.sortable-ghost')).eq(null);
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });

  it('cancels a pending touch drag when a server refresh removes that card', async () => {
    vi.useFakeTimers();
    const wrapper = mount(SortableCards, options);
    try {
      wrapper.get('[data-card-name="Birds"]').element.dispatchEvent(new PointerEvent('pointerdown',
        {button: 0, pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10}));
      await wrapper.setProps({cards: cards.slice(1)});
      await vi.advanceTimersByTimeAsync(350);
      expect(document.querySelector('.sortable-ghost')).eq(null);
      expect(wrapper.vm.dragCard).eq(undefined);
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });
});
