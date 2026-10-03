import {shallowMount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import Board from '@/client/components/Board.vue';
import BoardSpace from '@/client/components/BoardSpace.vue';
import {SpaceModel} from '@/common/models/SpaceModel';
import {SpaceType} from '@/common/boards/SpaceType';
import {DEFAULT_EXPANSIONS} from '@/common/cards/GameModule';
import {BoardName} from '@/common/boards/BoardName';

const spaces: SpaceModel[] = [
  {
    id: '01',
    x: 1,
    y: 1,
    bonus: [],
    spaceType: SpaceType.COLONY,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
  {
    id: '02',
    x: 2,
    y: 1,
    bonus: [],
    spaceType: SpaceType.COLONY,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
  {
    id: '69',
    x: 3,
    y: 1,
    bonus: [],
    spaceType: SpaceType.COLONY,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
  {
    id: '04',
    x: 3,
    y: 1,
    bonus: [],
    spaceType: SpaceType.OCEAN,
    color: undefined,
    highlight: undefined,
    tileType: undefined,
  },
];


describe('Board', () => {
  it('has visible tiles on the board', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'hide', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    const boardSpacesWrappers = wrapper.findAllComponents(BoardSpace).filter((wrapper) => {
      return wrapper.attributes('data-test') === 'board-space';
    });

    expect(
      boardSpacesWrappers.every((wrapper) => wrapper.props('tileView') === 'hide'),
    ).to.be.true;
  });

  it('has hidden tiles on the board', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    const boardSpacesWrappers = wrapper.findAllComponents(BoardSpace).filter((wrapper) => {
      return wrapper.attributes('data-test') === 'board-space';
    });

    expect(
      boardSpacesWrappers.every((wrapper) => wrapper.props('tileView') === 'show'),
    ).to.be.true;
  });

  it('emits toggleTileView on toggle button click', async () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    await wrapper.find('[data-test=hide-tiles-button]').trigger('click');
    expect(wrapper.emitted('toggleTileView')?.length).to.be.eq(1);
  });

  it('renders "show tiles" in toggle button if tiles are hidden', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    expect(wrapper.find('[data-test=hide-tiles-button]').text()).to.be.eq('show tiles');
  });

  it('renders "hide tiles" in toggle button if tiles are visible', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces, expansions: DEFAULT_EXPANSIONS, tileView: 'hide', venusScaleLevel: 0, boardName: BoardName.THARSIS},
    });

    expect(wrapper.find('[data-test=hide-tiles-button]').text()).to.be.eq('hide tiles');
  });

  const customSpaces: SpaceModel[] = [
    {id: '100', x: 4, y: 0, bonus: [], spaceType: SpaceType.LAND, color: undefined, highlight: undefined, tileType: undefined},
    {id: '101', x: 2, y: 2, bonus: [], spaceType: SpaceType.OCEAN, color: undefined, highlight: undefined, tileType: undefined},
    {id: '102', x: 5, y: 4, bonus: [], spaceType: SpaceType.RESTRICTED, color: undefined, highlight: undefined, tileType: undefined},
  ];
  const stretched = {
    temperature: {min: -40, max: 20, step: 2, bonuses: []},
    oxygen: {min: 0, max: 20, step: 1, bonuses: []},
    venus: {min: 0, max: 30, step: 2, bonuses: []},
    oceans: {max: 12},
    heatForTemperature: 8,
  };
  // Only the ceiling is raised -- min/step for both tracks still match official, so this should
  // keep the painted curve (capped + pegged) rather than falling back to the plain list.
  const extendedMaxOnly = {
    temperature: {min: -30, max: 20, step: 2, bonuses: []},
    oxygen: {min: 0, max: 24, step: 1, bonuses: []},
    venus: {min: 0, max: 30, step: 2, bonuses: []},
    oceans: {max: 9},
    heatForTemperature: 8,
  };

  it('positions custom-board spaces by pixel', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM},
    });
    expect(wrapper.find('#board_legend').exists()).to.be.false;

    const spaceWrappers = wrapper.findAllComponents(BoardSpace)
      .filter((w) => w.attributes('data-test') === 'board-space');
    expect(spaceWrappers).to.have.length(3);
    expect(spaceWrappers.every((w) => w.props('pixel') !== undefined)).to.be.true;
    // maxY is 4, so the middle row is y=2 (zero row-shift): left === 49*x + 6.
    const middle = spaceWrappers.find((w) => w.props('space').id === '101')!;
    expect(middle.props('pixel')).to.deep.eq({left: 49 * 2 + 6, top: 34 + 41 * 2});
    const bottom = spaceWrappers.find((w) => w.props('space').id === '102')!;
    expect(bottom.props('pixel')).to.deep.eq({left: 49 * 5 + 6 - 49, top: 34 + 41 * 4});
  });

  it('keeps the painted Mars + curved tracks for a custom board on standard parameters', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM},
    });
    expect(wrapper.find('.board-without-venus').exists()).to.be.true;
    expect(wrapper.find('.board-cont--custom').exists()).to.be.false;
    expect(wrapper.find('.global-numbers--custom').exists()).to.be.false;
    // The hex grid is transformed to fit the painted diamond.
    expect(wrapper.find('#main_board').attributes('style') ?? '').to.match(/scale\(/);
  });

  it('renders only the present cells of a carved custom board (voids are just gaps)', () => {
    const twoSpaces: SpaceModel[] = [
      {id: '100', x: 2, y: 0, bonus: [], spaceType: SpaceType.LAND, color: undefined, highlight: undefined, tileType: undefined},
      {id: '101', x: 2, y: 4, bonus: [], spaceType: SpaceType.LAND, color: undefined, highlight: undefined, tileType: undefined},
    ];
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces: twoSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM, customBoardRows: 5},
    });
    const spaceWrappers = wrapper.findAllComponents(BoardSpace)
      .filter((w) => w.attributes('data-test') === 'board-space');
    expect(spaceWrappers).to.have.length(2);
  });

  it('keeps the painted Mars + curved tracks when only oceans.max is customized', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM,
        globalParameters: {
          temperature: {min: -30, max: 8, step: 2, bonuses: []},
          oxygen: {min: 0, max: 14, step: 1, bonuses: []},
          venus: {min: 0, max: 30, step: 2, bonuses: []},
          oceans: {max: 3},
          heatForTemperature: 8,
        },
      },
    });
    expect(wrapper.find('.board-without-venus').exists()).to.be.true;
    expect(wrapper.find('.board-cont--custom').exists()).to.be.false;
    expect(wrapper.find('.global-numbers--custom').exists()).to.be.false;
    expect(wrapper.find('#main_board').attributes('style') ?? '').to.match(/scale\(/);
    // The oceans readout itself is always a plain count/max text, curved layout or not -- it
    // just needs to reflect the customized max, which it does regardless of this fix.
    expect(wrapper.find('.global-numbers-oceans').text()).to.contain('0/3');
  });

  it('drops the painting for a plain readout when parameters are stretched', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM, globalParameters: stretched},
    });
    expect(wrapper.find('.board-cont--custom').exists()).to.be.true;
    expect(wrapper.find('.board-with-venus').exists()).to.be.false;
    expect(wrapper.find('.board-without-venus').exists()).to.be.false;
    expect(wrapper.find('.global-numbers--custom').exists()).to.be.true;
    // Locks in that the "+N" badges are painted-curve-only UI, never shown in the plain-list
    // fallback -- stretched's own maxes (20/20) are also past official, but that shouldn't matter.
    expect(wrapper.find('.global-numbers-temperature-extra').exists()).to.be.false;
    expect(wrapper.find('.global-numbers-oxygen-extra').exists()).to.be.false;
  });

  it('keeps the painted Mars + curved tracks when only temperature/oxygen max is stretched', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM,
        globalParameters: extendedMaxOnly,
      },
    });
    expect(wrapper.find('.board-without-venus').exists()).to.be.true;
    expect(wrapper.find('.board-cont--custom').exists()).to.be.false;
    expect(wrapper.find('.global-numbers--custom').exists()).to.be.false;
    expect(wrapper.find('#main_board').attributes('style') ?? '').to.match(/scale\(/);
  });

  it('caps rendered track marks at the official max even when the configured max is higher', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM,
        globalParameters: extendedMaxOnly, oxygen_level: 0, temperature: -30,
      },
    });
    // Official: oxygen 0..14 step 1 = 15 marks; temperature -30..8 step 2 = 20 marks.
    expect(wrapper.find('.global-numbers-oxygen').findAll('.global-numbers-value')).to.have.length(15);
    expect(wrapper.find('.global-numbers-temperature').findAll('.global-numbers-value')).to.have.length(20);
    expect(wrapper.find('.global-numbers-oxygen').find('.val-16').exists()).to.be.false;
    expect(wrapper.find('.global-numbers-oxygen').find('.val-20').exists()).to.be.false;
    expect(wrapper.find('.global-numbers-oxygen').find('.val-24').exists()).to.be.false;
    // Temperature's own official values are all even too, so -- unlike oxygen's 16/20/24 -- 10 is
    // only reachable if the capping didn't happen (stretched max is 20, so 10 would otherwise be
    // a real mark).
    expect(wrapper.find('.global-numbers-temperature').find('.val-10').exists()).to.be.false;
    expect(wrapper.find('.global-numbers-temperature').find('.val-20').exists()).to.be.false;
  });

  it('pegs the marker at the official max once the live value exceeds it', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM,
        globalParameters: extendedMaxOnly, oxygen_level: 18, temperature: 12,
      },
    });
    const oxygenActive = wrapper.find('.global-numbers-oxygen').findAll('.val-is-active');
    expect(oxygenActive).to.have.length(1);
    expect(oxygenActive[0].classes()).to.include('val-14');

    const temperatureActive = wrapper.find('.global-numbers-temperature').findAll('.val-is-active');
    expect(temperatureActive).to.have.length(1);
    expect(temperatureActive[0].classes()).to.include('val-8');
  });

  it('shows the extra-steps badge with the right count once past official max', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM,
        globalParameters: extendedMaxOnly, oxygen_level: 18, temperature: 12,
      },
    });
    expect(wrapper.find('.global-numbers-oxygen-extra').text()).to.eq('+4');
    expect(wrapper.find('.global-numbers-temperature-extra').text()).to.eq('+2');
  });

  it('hides the extra-steps badge while at or below the official max', () => {
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM,
        globalParameters: extendedMaxOnly, oxygen_level: 10, temperature: -10,
      },
    });
    expect(wrapper.find('.global-numbers-oxygen-extra').exists()).to.be.false;
    expect(wrapper.find('.global-numbers-temperature-extra').exists()).to.be.false;
  });

  it('still falls back fully when a venus-only stretch leaves temperature/oxygen standard', () => {
    const venusExtended = {
      temperature: {min: -30, max: 8, step: 2, bonuses: []},
      oxygen: {min: 0, max: 14, step: 1, bonuses: []},
      venus: {min: 0, max: 40, step: 2, bonuses: []},
      oceans: {max: 9},
      heatForTemperature: 8,
    };
    const wrapper = shallowMount(Board, {
      ...globalConfig,
      props: {
        spaces: customSpaces, expansions: DEFAULT_EXPANSIONS, tileView: 'show', venusScaleLevel: 0, boardName: BoardName.CUSTOM,
        globalParameters: venusExtended,
      },
    });
    expect(wrapper.find('.global-numbers--custom').exists()).to.be.true;
    expect(wrapper.find('.board-cont--custom').exists()).to.be.true;
  });
});
