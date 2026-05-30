import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import SortableCards from '@/client/components/SortableCards.vue';
import {FakeLocalStorage} from './FakeLocalStorage';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

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
    let cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards).has.length(2);
    expect(cards[0].props().card.name).to.eq(CardName.ANTS);
    expect(cards[1].props().card.name).to.eq(CardName.CARTEL);
    const draggers = sortable.findAll('[draggable=true]');
    await draggers[1].trigger('dragstart');
    await draggers[0].trigger('dragover');
    await draggers[1].trigger('dragend');
    cards = sortable.findAllComponents({
      name: 'Card',
    });
    expect(cards[0].props().card.name).to.eq(CardName.CARTEL);
    expect(cards[1].props().card.name).to.eq(CardName.ANTS);
    const order = localStorage.getItem('cardOrderfoo');
    expect(order).not.to.be.undefined;
    expect(JSON.parse(order!)).to.deep.eq({
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
    const order = localStorage.getItem('cardOrderfoo');
    expect(order).not.to.be.undefined;
    expect(JSON.parse(order!)).to.deep.eq({
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
    const order = localStorage.getItem('cardOrderfoo');
    expect(order).not.to.be.undefined;
    expect(JSON.parse(order!)).to.deep.eq({
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
    const order = localStorage.getItem('cardOrderfoo');
    expect(order).not.to.be.undefined;
    expect(JSON.parse(order!)).to.deep.eq({
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
    localStorage.setItem('cardOrderfoo', JSON.stringify({
      [CardName.ANTS]: 2,
      [CardName.CARTEL]: 1,
      [CardName.DECOMPOSERS]: 3,
    }));
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
    const order = localStorage.getItem('cardOrderfoo');
    expect(order).not.to.be.undefined;
    expect(JSON.parse(order!)).to.deep.eq({
      [CardName.ANTS]: 1,
      [CardName.CARTEL]: 3,
      [CardName.BIRDS]: 2,
    });
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
