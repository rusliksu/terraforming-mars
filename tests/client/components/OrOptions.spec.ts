import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import OrOptions from '@/client/components/OrOptions.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {InputResponse} from '@/common/inputs/InputResponse';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';

describe('OrOptions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('saves the options ignoring hidden', async () => {
    let savedData: InputResponse | undefined;
    PreferencesManager.INSTANCE.set('learner_mode', false);
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'card',
            title: 'hide this',
            showOnlyInLearnerMode: true,
          }, {
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            title: 'select b',
            type: 'option',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 1, response: {type: 'option'}});
  });
  it('playerFactorySaved returns correct original index when options are filtered', async () => {
    let savedData: InputResponse | undefined;
    PreferencesManager.INSTANCE.set('learner_mode', false);
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'card',
            title: 'hide this',
            showOnlyInLearnerMode: true,
          }, {
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select b',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    // First option (card) is filtered out. Two displayed: select a (orig 1), select b (orig 2).
    const inputs = component.findAll('input');
    expect(inputs.length).to.eq(2);
    // Select the second displayed option (select b, original index 2)
    await inputs[1].setValue(true);
    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 2, response: {type: 'option'}});
  });

  it('selecting different radio options shows correct sub-form', async () => {
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
          }, {
            type: 'option',
            title: 'select b',
          }],
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });
    // First option is selected by default
    let factories = component.findAllComponents({name: 'PlayerInputFactory'});
    expect(factories.length).to.eq(1);
    expect(factories[0].props('playerinput').title).to.eq('select a');

    // Click second radio
    const inputs = component.findAll('input');
    await inputs[1].setValue(true);

    factories = component.findAllComponents({name: 'PlayerInputFactory'});
    expect(factories.length).to.eq(1);
    expect(factories[0].props('playerinput').title).to.eq('select b');
  });

  it('saving with non-first selected option returns correct index', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select b',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select c',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    // Select third option
    const inputs = component.findAll('input');
    await inputs[2].setValue(true);
    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 2, response: {type: 'option'}});
  });

  it('clicks 2nd option', async () => {
    let savedData: InputResponse | undefined;
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        components: {
          'PlayerInputFactory': PlayerInputFactory,
        },
      },
      props: {
        player: {
          id: 'foo',
        },
        players: [],
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'foo',
          options: [{
            type: 'option',
            title: 'select a',
            buttonLabel: '',
          }, {
            type: 'option',
            title: 'select b',
            buttonLabel: '',
          }],
        },
        onsave: function(data: InputResponse) {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    const inputs = component.findAll('input');
    await inputs[1].setValue(true);

    const buttons = component.findAllComponents({name: 'AppButton'});
    await buttons[0].trigger('click');
    expect(savedData).to.deep.eq({type: 'or', index: 1, response: {type: 'option'}});
  });

  it('showChildSaveButton is true only for multi-select cards', () => {
    const vm = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {type: 'or', title: '', options: [{type: 'option', title: 'a'}]},
        onsave: () => {},
      },
    }).vm;
    expect(vm.showChildSaveButton({type: 'card', min: 0, max: 5})).to.be.true;
    expect(vm.showChildSaveButton({type: 'card', min: 1, max: 1})).to.be.false;
    expect(vm.showChildSaveButton({type: 'option'})).to.be.false;
  });

  it('child save button label includes card count', () => {
    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: '',
          options: [{
            type: 'card',
            title: 'Sell Patents',
            buttonLabel: 'Sell',
            cards: [],
            min: 0,
            max: 5,
            showOnlyInLearnerMode: false,
            selectBlueCardAction: false,
            showOwner: false,
          }],
        },
        onsave: () => {},
        showsave: true,
      },
    });
    expect(component.findComponent({name: 'AppButton'}).text()).to.eq('Sell 0');
  });

  it('allows quick greenery placement from the main action prompt', async () => {
    let savedData: InputResponse | undefined;
    const board = document.createElement('div');
    board.id = 'main_board';
    const space = document.createElement('div');
    space.className = 'board-space-selectable';
    space.setAttribute('data_space_id', '01');
    board.appendChild(space);
    document.body.appendChild(board);

    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'Take your first action',
          buttonLabel: 'Take action',
          options: [{
            type: 'option',
            title: 'Do something else',
            buttonLabel: 'Save',
          }, {
            type: 'space',
            title: {message: 'Convert ${0} plants into greenery', data: []},
            buttonLabel: 'Save',
            spaces: ['01', '02'],
          }],
        },
        onsave: (data: InputResponse) => {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    await component.vm.$nextTick();

    expect(space.classList.contains('board-space--available')).is.true;
    space.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));

    expect(savedData).deep.eq({
      type: 'or',
      index: 1,
      response: {type: 'space', spaceId: '01'},
    });
  });

  it('keeps selectable spaces highlighted when convert plants is selected manually', async () => {
    const board = document.createElement('div');
    board.id = 'main_board';
    const space = document.createElement('div');
    space.className = 'board-space-selectable';
    space.setAttribute('data_space_id', '01');
    board.appendChild(space);
    document.body.appendChild(board);

    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'Take your first action',
          buttonLabel: 'Take action',
          options: [{
            type: 'option',
            title: 'Do something else',
            buttonLabel: 'Save',
          }, {
            type: 'space',
            title: {message: 'Convert ${0} plants into greenery', data: []},
            buttonLabel: 'Save',
            spaces: ['01'],
          }],
        },
        onsave: () => {},
        showsave: true,
        showtitle: true,
      },
    });
    await component.vm.$nextTick();

    const inputs = component.findAll('input');
    await inputs[1].setValue(true);
    await component.vm.$nextTick();

    expect(space.classList.contains('board-space--available')).is.true;
  });

  it('does not allow quick greenery placement outside the main action prompt', async () => {
    let savedData: InputResponse | undefined;
    const board = document.createElement('div');
    board.id = 'main_board';
    const space = document.createElement('div');
    space.className = 'board-space-selectable';
    space.setAttribute('data_space_id', '01');
    board.appendChild(space);
    document.body.appendChild(board);

    const component = mount(OrOptions, {
      ...globalConfig,
      global: {...globalConfig.global, components: {'PlayerInputFactory': PlayerInputFactory}},
      props: {
        playerView: {},
        playerinput: {
          type: 'or',
          title: 'Select milestone payment',
          buttonLabel: 'Pay',
          options: [{
            type: 'option',
            title: 'Pay 8 M€',
            buttonLabel: 'Pay',
          }, {
            type: 'space',
            title: {message: 'Convert ${0} plants into greenery', data: []},
            buttonLabel: 'Save',
            spaces: ['01'],
          }],
        },
        onsave: (data: InputResponse) => {
          savedData = data;
        },
        showsave: true,
        showtitle: true,
      },
    });
    await component.vm.$nextTick();

    expect(space.classList.contains('board-space--available')).is.false;
    space.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));

    expect(savedData).is.undefined;
  });
});
