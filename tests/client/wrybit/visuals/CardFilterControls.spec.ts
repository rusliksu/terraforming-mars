import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {reactive} from 'vue';
import {vi} from 'vitest';
import CardFilterBar from '@/client/wrybit/visuals/cardfilter/CardFilterBar.vue';
import OtherPlayer from '@/client/wrybit/visuals/OtherPlayer.vue';
import {emptyCardFilter} from '@/client/wrybit/visuals/cardfilter/cardFilter';
import {activateCardFilterOwner, handCardFilter, playedCardFilter, resetCardFilterState, setUnmatchedCards, unmatchedCards} from '@/client/wrybit/visuals/cardfilter/cardFilterState';
import {attachCardZoom, cardZoomState, setCardZoom} from '@/client/wrybit/visuals/cardfilter/cardZoom';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit card filter controls', () => {
  it('filters public played cards through buttons, dims instead of hiding and follows model refresh', async () => {
    resetCardFilterState();
    const player = fakePublicPlayerModel({tableau: [{name: CardName.BIRDS}, {name: CardName.ASTEROID}]});
    const wrapper = mount(OtherPlayer, {...globalConfig, props: {player, playerIndex: 0},
      global: {...globalConfig.global, mocks: {getVisibilityState: () => true}}});
    try {
      await wrapper.get('.card-filter-bar__filter > button').trigger('click');
      await wrapper.get('button[title="Animal"]').trigger('click');
      expect(wrapper.findAll('.wrybit-card')).has.length(1);
      expect(wrapper.get('.card-filter-bar__count').text()).eq('1/2');
      const dim = wrapper.findAll('[role="radio"]').find((radio) => radio.text() === 'Dimmed')!;
      await dim.trigger('click');
      expect(wrapper.findAll('.wrybit-card')).has.length(2);
      expect(wrapper.findAll('.card-filter-dimmed')).has.length(1);
      await wrapper.setProps({player: {...player, tableau: [{name: CardName.BIRDS}, {name: CardName.ANTS}]}});
      expect(wrapper.get('.card-filter-bar__count').text()).eq('1/2');
      expect(wrapper.findAll('.card-filter-dimmed')).has.length(1);
      expect(wrapper.text()).not.contains('Cost up to');
    } finally {
      wrapper.unmount();
      resetCardFilterState();
    }
  });

  it('keeps the mobile sheet inside the optional overlay root and cleans listeners after unmount', async () => {
    let resized: ((entries: ResizeObserverEntry[]) => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: (entries: ResizeObserverEntry[]) => void) {
        resized = callback;
      }
      observe() {}
      disconnect = disconnect;
    });
    document.documentElement.classList.add('tm-mobile');
    const wrapper = mount(CardFilterBar, {...globalConfig, attachTo: document.body, props: {
      cards: [{name: CardName.BIRDS}], filter: reactive(emptyCardFilter()), context: {withCost: true},
    }});
    try {
      resized!([{contentRect: {width: 390}} as ResizeObserverEntry]);
      await wrapper.get('.card-filter-bar__filter > button').trigger('click');
      expect(document.querySelector('.wrybit-ui.wrybit-overlay-root .card-filter-sheet')).not.eq(null);
      wrapper.unmount();
      expect(document.querySelector('.card-filter-sheet')).eq(null);
      expect(disconnect.mock.calls).has.length(1);
      document.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
    } finally {
      wrapper.unmount();
      document.documentElement.classList.remove('tm-mobile');
      vi.unstubAllGlobals();
    }
  });

  it('resets transient filters on viewer change while retaining the hide/dim preference', () => {
    resetCardFilterState();
    activateCardFilterOwner('game/one');
    handCardFilter.tags.add(Tag.SPACE);
    playedCardFilter.tags.add(Tag.ANIMAL);
    setUnmatchedCards('dim');
    activateCardFilterOwner('game/one');
    expect(handCardFilter.tags.has(Tag.SPACE)).is.true;
    activateCardFilterOwner('game/two');
    expect(handCardFilter.tags.size).eq(0);
    expect(playedCardFilter.tags.size).eq(0);
    expect(unmatchedCards.value).eq('dim');
    resetCardFilterState();
  });

  it('binds zoom to mounted optional roots and releases only the last owner', () => {
    const root = document.createElement('div');
    root.style.setProperty('--wrybit-card-zoom', '0.8');
    const htmlStyle = document.documentElement.getAttribute('style');
    const first = attachCardZoom(root);
    const second = attachCardZoom(root);
    try {
      setCardZoom(0.6);
      expect(root.style.getPropertyValue('--wrybit-card-zoom')).eq('0.6');
      first();
      setCardZoom(0.7);
      expect(root.style.getPropertyValue('--wrybit-card-zoom')).eq('0.7');
      second();
      expect(root.style.getPropertyValue('--wrybit-card-zoom')).eq('0.8');
      expect(document.documentElement.getAttribute('style')).eq(htmlStyle);
    } finally {
      first(); second();
      setCardZoom(1);
    }
    expect(cardZoomState.zoom).eq(1);
  });
});
