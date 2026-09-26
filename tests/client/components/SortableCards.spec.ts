import {mount, VueWrapper} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import SortableCards from '@/client/components/SortableCards.vue';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';
import {FakeLocalStorage} from './FakeLocalStorage';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

type DropSide = 'left' | 'right';

/**
 * Drag card at `sourceIndex` to `targetIndex` on its left or right side.
 */
async function dragCard(sortable: VueWrapper<InstanceType<typeof SortableCards>>, sourceIndex: number, targetIndex: number, position: DropSide) {
  const draggers = sortable.findAll('[draggable=true]');
  const target = draggers[targetIndex];

  // This test doesn't use a real layout, so cards aren't 200px wide. Here,
  // they're simulated at 10px. Positions 0-4 are the left side and positions
  // 5-9 are the right side.
  target.element.getBoundingClientRect = () => {
    return {left: 0, width: 10} as DOMRect;
  };

  await draggers[sourceIndex].trigger('dragstart');
  // 3 is the left side, 8 is the right side.
  await target.trigger('dragover', {clientX: position === 'left' ? 3 : 8});
  await draggers[sourceIndex].trigger('dragend');
}

/**
 * Returns the names of cards in this widget in their current order.
 */
function cardsInOrder(sortable: VueWrapper<InstanceType<typeof SortableCards>>): Array<CardName> {
  return sortable.findAllComponents({
    name: 'Card',
  }).map((card) => card.props().card.name);
}


describe('SortableCards', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    PreferencesManager.resetForTest();
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });
  afterEach(() => {
    PreferencesManager.resetForTest();
    FakeLocalStorage.deregister(localStorage);
  });

  it('allows sorting after initial loading with no local storage', async () => {
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{
          name: CardName.ANTS,
        }, {
          name: CardName.CARTEL,
        }],
        playerId: 'foo',
      },
    });
    expect(cardsInOrder(sortable)).to.deep.eq([CardName.ANTS, CardName.CARTEL]);

    await dragCard(sortable, 0, 1, 'right');

    expect(cardsInOrder(sortable)).to.deep.eq([CardName.CARTEL, CardName.ANTS]);
    expect(CardOrderStorage.getCardOrder('foo')).to.deep.eq({
      [CardName.ANTS]: 2,
      [CardName.CARTEL]: 1,
    });
  });
  it('moves dragged cards into the hovered position and shifts the intervening cards', async () => {
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{
          name: CardName.ANTS,
        }, {
          name: CardName.CARTEL,
        }, {
          name: CardName.BIRDS,
        }, {
          name: CardName.DECOMPOSERS,
        }],
        playerId: 'foo',
      },
    });
    const draggers = sortable.findAll('[draggable=true]');
    await draggers[3].trigger('dragstart');
    await draggers[1].trigger('dragover');
    await draggers[3].trigger('dragend');
    const cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards.map((card) => card.props().card.name)).to.deep.eq([
      CardName.ANTS,
      CardName.DECOMPOSERS,
      CardName.CARTEL,
      CardName.BIRDS,
    ]);
    expect(CardOrderStorage.getCardOrder('foo')).to.deep.eq({
      [CardName.ANTS]: 1,
      [CardName.DECOMPOSERS]: 2,
      [CardName.CARTEL]: 3,
      [CardName.BIRDS]: 4,
    });
  });
  it('moves dragged cards forward without swapping with the hovered card', async () => {
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{
          name: CardName.ANTS,
        }, {
          name: CardName.CARTEL,
        }, {
          name: CardName.BIRDS,
        }, {
          name: CardName.DECOMPOSERS,
        }],
        playerId: 'foo',
      },
    });
    const draggers = sortable.findAll('[draggable=true]');
    await draggers[0].trigger('dragstart');
    await draggers[2].trigger('dragover');
    await draggers[0].trigger('dragend');
    const cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards.map((card) => card.props().card.name)).to.deep.eq([
      CardName.CARTEL,
      CardName.BIRDS,
      CardName.ANTS,
      CardName.DECOMPOSERS,
    ]);
    expect(CardOrderStorage.getCardOrder('foo')).to.deep.eq({
      [CardName.CARTEL]: 1,
      [CardName.BIRDS]: 2,
      [CardName.ANTS]: 3,
      [CardName.DECOMPOSERS]: 4,
    });
  });
  it('uses the pointer half of the hovered card when inserting forward', async () => {
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{
          name: CardName.ANTS,
        }, {
          name: CardName.CARTEL,
        }, {
          name: CardName.BIRDS,
        }, {
          name: CardName.DECOMPOSERS,
        }],
        playerId: 'foo',
      },
    });
    const draggers = sortable.findAll('[draggable=true]');
    draggers[2].element.getBoundingClientRect = () => ({
      left: 100,
      right: 300,
      top: 0,
      bottom: 300,
      width: 200,
      height: 300,
      x: 100,
      y: 0,
      toJSON: () => {},
    });
    await draggers[0].trigger('dragstart');
    await draggers[2].trigger('dragover', {clientX: 150});
    await draggers[0].trigger('dragend');
    const cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards.map((card) => card.props().card.name)).to.deep.eq([
      CardName.CARTEL,
      CardName.ANTS,
      CardName.BIRDS,
      CardName.DECOMPOSERS,
    ]);
    expect(CardOrderStorage.getCardOrder('foo')).to.deep.eq({
      [CardName.CARTEL]: 1,
      [CardName.ANTS]: 2,
      [CardName.BIRDS]: 3,
      [CardName.DECOMPOSERS]: 4,
    });
  });
  it('keeps a dragged card in the adjacent slot while hovering back and forth', async () => {
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{
          name: CardName.ANTS,
        }, {
          name: CardName.CARTEL,
        }, {
          name: CardName.BIRDS,
        }, {
          name: CardName.DECOMPOSERS,
        }],
        playerId: 'foo',
      },
    });
    const draggers = sortable.findAll('[draggable=true]');
    draggers[1].element.getBoundingClientRect = () => ({
      left: 100,
      right: 300,
      top: 0,
      bottom: 300,
      width: 200,
      height: 300,
      x: 100,
      y: 0,
      toJSON: () => {},
    });
    draggers[2].element.getBoundingClientRect = () => ({
      left: 300,
      right: 500,
      top: 0,
      bottom: 300,
      width: 200,
      height: 300,
      x: 300,
      y: 0,
      toJSON: () => {},
    });
    await draggers[0].trigger('dragstart');
    await draggers[2].trigger('dragover', {clientX: 350});
    await draggers[1].trigger('dragover', {clientX: 250});
    await draggers[2].trigger('dragover', {clientX: 350});
    await draggers[0].trigger('dragend');
    const cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards.map((card) => card.props().card.name)).to.deep.eq([
      CardName.CARTEL,
      CardName.ANTS,
      CardName.BIRDS,
      CardName.DECOMPOSERS,
    ]);
  });
  it('puts new cards at end of order and removes old', async () => {
    CardOrderStorage.updateCardOrder('foo', {
      [CardName.ANTS]: 2,
      [CardName.CARTEL]: 1,
      [CardName.DECOMPOSERS]: 3,
    });
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{
          name: CardName.ANTS,
        }, {
          name: CardName.CARTEL,
        }, {
          name: CardName.BIRDS,
        }],
        playerId: 'foo',
      },
    });
    let cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards).has.length(3);
    expect(cards[0].props().card.name).to.eq(CardName.CARTEL);
    expect(cards[1].props().card.name).to.eq(CardName.ANTS);
    expect(cards[2].props().card.name).to.eq(CardName.BIRDS);
    const draggers = sortable.findAll('[draggable=true]');
    await draggers[0].trigger('dragstart');
    await draggers[2].trigger('dragover');
    await draggers[0].trigger('dragend');
    cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards[0].props().card.name).to.eq(CardName.ANTS);
    expect(cards[1].props().card.name).to.eq(CardName.BIRDS);
    expect(cards[2].props().card.name).to.eq(CardName.CARTEL);
    expect(CardOrderStorage.getCardOrder('foo')).to.deep.eq({
      [CardName.ANTS]: 1,
      [CardName.CARTEL]: 3,
      [CardName.BIRDS]: 2,
    });
  });
  it('renders each card name once when refreshed props contain duplicates', async () => {
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{name: CardName.ANTS}, {name: CardName.CARTEL}],
        playerId: 'foo',
      },
    });

    await sortable.setProps({
      cards: [
        {name: CardName.ANTS},
        {name: CardName.ANTS},
        {name: CardName.CARTEL},
        {name: CardName.CARTEL},
      ],
    });

    const cards = sortable.findAllComponents({name: 'Card'});
    expect(cards.map((card) => card.props().card.name)).to.deep.eq([
      CardName.ANTS,
      CardName.CARTEL,
    ]);
  });
  it('does not show point-and-click reorder affordances in experimental UI', () => {
    PreferencesManager.INSTANCE.set('experimental_ui', true);
    const sortable = mount(SortableCards, {
      ...globalConfig,
      props: {
        cards: [{
          name: CardName.ANTS,
        }, {
          name: CardName.CARTEL,
        }],
        playerId: 'foo',
      },
    });
    expect(sortable.find('input[type="checkbox"]').exists()).to.eq(false);
    expect(sortable.findAll('.reorder-banners-container')).to.have.length(0);
  });
});
