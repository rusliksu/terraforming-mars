import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import SimpleMapEditor from '@/client/components/SimpleMapEditor.vue';
import {decodeSimpleBoard, encodeSimpleBoard} from '@/common/boards/simpleBoardCodec';
import {blankSimpleBoard} from '@/common/boards/SimpleCustomBoardDefinition';
import {SpaceType} from '@/common/boards/SpaceType';
import {SpaceBonus} from '@/common/boards/SpaceBonus';

describe('SimpleMapEditor', () => {
  it('links back to the Mars editor and to the other simple board type', () => {
    const venus = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    let links = venus.findAll('.simple-map-editor-board-nav a').map((a) => a.attributes('href'));
    expect(links).to.include('map-editor');
    expect(links).to.include('map-editor?board=moon');

    const moon = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    links = moon.findAll('.simple-map-editor-board-nav a').map((a) => a.attributes('href'));
    expect(links).to.include('map-editor');
    expect(links).to.include('map-editor?board=venus');
  });

  it('mounts a Venus board with 37 hexes and a valid code', () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    const hexes = wrapper.findAll('.simple-map-editor-hex');
    expect(hexes.length).to.eq(37);
    const code = (wrapper.vm as any).code as string;
    expect(code.startsWith('TMBS1')).to.be.true;
    const decoded = decodeSimpleBoard(code);
    expect(decoded.boardType).to.eq('venusPhase2');
    expect(decoded.spaces).to.have.length(37);
  });

  it('mounts a Moon board with 35 hexes', () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    expect(wrapper.findAll('.simple-map-editor-hex').length).to.eq(35);
    const decoded = decodeSimpleBoard((wrapper.vm as any).code);
    expect(decoded.boardType).to.eq('moon');
    expect(decoded.spaces).to.have.length(35);
  });

  it('offers a bonus palette on both Venus and Moon, with Venus getting extra tools', () => {
    const venus = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    expect(venus.text()).to.include('Bonuses');
    // Steel/titanium/card (shared with Moon) plus energy/heat/M€/floater.
    expect((venus.vm as any).bonusTools).to.have.length(7);

    const moon = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    expect(moon.text()).to.include('Bonuses');
    expect((moon.vm as any).bonusTools).to.have.length(3);
  });

  it('offers energy/heat/M€/floater bonus tools on Venus but not Moon', () => {
    const venus = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    const venusKeys = (venus.vm as any).bonusTools.map((t: any) => t.key);
    expect(venusKeys).to.include('bonus:' + SpaceBonus.ENERGY);
    expect(venusKeys).to.include('bonus:' + SpaceBonus.HEAT);
    expect(venusKeys).to.include('bonus:' + SpaceBonus.MEGACREDITS);
    expect(venusKeys).to.include('bonus:' + SpaceBonus.FLOATER);

    const moon = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    const moonKeys = (moon.vm as any).bonusTools.map((t: any) => t.key);
    expect(moonKeys).to.not.include('bonus:' + SpaceBonus.FLOATER);
  });

  it('painting the floater bonus on Venus round-trips through the code', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    (wrapper.vm as any).tool = 'bonus:' + SpaceBonus.FLOATER;
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');

    expect(decodeSimpleBoard((wrapper.vm as any).code).spaces[0].bonus).to.deep.eq([SpaceBonus.FLOATER]);
  });

  it('painting a bonus on Venus stacks bonuses, right-click removes the last one', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    (wrapper.vm as any).tool = 'bonus:' + SpaceBonus.TITANIUM;
    await wrapper.vm.$nextTick();
    const hex = wrapper.findAll('.simple-map-editor-hex')[0];
    await hex.trigger('click');
    await hex.trigger('click');
    expect(decodeSimpleBoard((wrapper.vm as any).code).spaces[0].bonus).to.deep.eq([SpaceBonus.TITANIUM, SpaceBonus.TITANIUM]);

    await hex.trigger('contextmenu');
    expect(decodeSimpleBoard((wrapper.vm as any).code).spaces[0].bonus).to.deep.eq([SpaceBonus.TITANIUM]);
  });

  it('painting a hex changes its type in the generated code (Venus: land -> gaslight)', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    (wrapper.vm as any).tool = 'type:' + SpaceType.GASLIGHT;
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');
    const decoded = decodeSimpleBoard((wrapper.vm as any).code);
    expect(decoded.spaces[0].spaceType).to.eq(SpaceType.GASLIGHT);
  });

  it('painting a bonus on Moon stacks bonuses, right-click removes the last one', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    (wrapper.vm as any).tool = 'bonus:' + SpaceBonus.STEEL;
    await wrapper.vm.$nextTick();
    const hex = wrapper.findAll('.simple-map-editor-hex')[0];
    await hex.trigger('click');
    await hex.trigger('click');
    expect(decodeSimpleBoard((wrapper.vm as any).code).spaces[0].bonus).to.deep.eq([SpaceBonus.STEEL, SpaceBonus.STEEL]);

    await hex.trigger('contextmenu');
    expect(decodeSimpleBoard((wrapper.vm as any).code).spaces[0].bonus).to.deep.eq([SpaceBonus.STEEL]);
  });

  it('Load rebuilds the editor from a pasted code', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    const source = blankSimpleBoard('venusPhase2', 'Loaded Venus');
    source.spaces[0].spaceType = SpaceType.GASLIGHT;

    (wrapper.vm as any).loadInput = encodeSimpleBoard(source);
    (wrapper.vm as any).loadCode();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).name).to.eq('Loaded Venus');
    expect(decodeSimpleBoard((wrapper.vm as any).code)).to.deep.eq(source);
  });

  it('Load rejects a code for the wrong board type instead of silently adopting it', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    const wrongBoard = blankSimpleBoard('moon', 'Wrong Board');

    (wrapper.vm as any).loadInput = encodeSimpleBoard(wrongBoard);
    (wrapper.vm as any).loadCode();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).loadError).to.not.eq('');
    expect((wrapper.vm as any).name).to.not.eq('Wrong Board');
  });

  it('the export source has one b.row(...) line per grid row and reflects painted types', () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    const source = (wrapper.vm as any).exportSource as string;
    const lines = source.split('\n');
    expect(lines).to.have.length(7); // Venus's own hexRowLayout has 7 rows (side length 4).
    expect(lines[0]).to.match(/^b\.row\(\d+\)(\.land\(\)){4};$/);
  });

  it('renders the real board preview component for the given board type', () => {
    const venus = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    expect(venus.findComponent({name: 'VenusSurfaceBoard'}).exists()).is.true;

    const moon = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    expect(moon.findComponent({name: 'MoonBoard'}).exists()).is.true;
  });

  it('shows the 30-60 track only once (the calibration tool\'s own copy, not a second one inside the hex-grid preview)', () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    // The preview's own VenusSurfaceBoard is told not to render its copy -- see showScaleTrack.
    expect(wrapper.findAllComponents({name: 'VenusSurfaceBoard'})[0].props('showScaleTrack')).is.false;
    expect(wrapper.findAll('.venus-scale-track-2')).to.have.lengthOf(1);
  });

  it('does not offer reservation tools for Moon (only Venus has Stratopolis/Maxwell Base)', () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    expect(wrapper.text()).to.not.include('Reserved spots');
  });

  it('reserving a hex for Stratopolis marks it, and clearing unreserves it', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    (wrapper.vm as any).tool = 'reserved:stratopolis';
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');
    expect((wrapper.vm as any).grid[0].reserved).to.eq('stratopolis');
    expect(decodeSimpleBoard((wrapper.vm as any).code).spaces[0].reserved).to.eq('stratopolis');

    (wrapper.vm as any).tool = 'reserved:clear';
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');
    expect((wrapper.vm as any).grid[0].reserved).is.undefined;
  });

  it('reserving a new hex for the same spot moves it off the old one (only one at a time)', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    (wrapper.vm as any).tool = 'reserved:stratopolis';
    await wrapper.vm.$nextTick();
    const hexes = wrapper.findAll('.simple-map-editor-hex');
    await hexes[0].trigger('click');
    await hexes[1].trigger('click');

    expect((wrapper.vm as any).grid[0].reserved).is.undefined;
    expect((wrapper.vm as any).grid[1].reserved).to.eq('stratopolis');
  });

  it('Stratopolis and Maxwell Base can be reserved independently on different hexes', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    const hexes = wrapper.findAll('.simple-map-editor-hex');

    (wrapper.vm as any).tool = 'reserved:stratopolis';
    await wrapper.vm.$nextTick();
    await hexes[0].trigger('click');

    (wrapper.vm as any).tool = 'reserved:maxwellBase';
    await wrapper.vm.$nextTick();
    await hexes[1].trigger('click');

    expect((wrapper.vm as any).grid[0].reserved).to.eq('stratopolis');
    expect((wrapper.vm as any).grid[1].reserved).to.eq('maxwellBase');
  });

  it('the preview shows a reservation on the main grid with the real fixed id, not the off-grid tray', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    (wrapper.vm as any).tool = 'reserved:stratopolis';
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');
    await wrapper.vm.$nextTick();

    const model = (wrapper.vm as any).previewModel;
    const stratopolisSpace = model.spaces.find((s: any) => s.id === '298');
    expect(stratopolisSpace).to.exist;
    expect(stratopolisSpace.x).to.not.eq(-1);
    expect(stratopolisSpace.spaceType).to.eq(SpaceType.COLONY);
    // Maxwell Base wasn't reserved on-grid, so it still falls back to the off-grid stub.
    const maxwellBaseSpace = model.spaces.find((s: any) => s.id === '299');
    expect(maxwellBaseSpace.x).to.eq(-1);
  });

  it('the export source emits .stratopolis()/.maxwellBase() for reserved cells instead of terrain', async () => {
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
    (wrapper.vm as any).tool = 'reserved:stratopolis';
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');
    await wrapper.vm.$nextTick();

    const source = (wrapper.vm as any).exportSource as string;
    expect(source).to.include('.stratopolis()');
  });

  it('gives the Moon preview real m-prefixed ids MoonBoard.vue positions by CSS, not generic ones', () => {
    // MoonBoard.vue's template positions every grid hex via hand-tuned CSS keyed to its exact id
    // ('.moon-space-m02'..'.moon-space-m36' in moon.less) -- a generic id (customSpaceId's
    // Mars-style '100', '101'...) matches no CSS rule, so every hex silently falls back to its
    // default position and they all stack on top of each other. Unlike Venus's board, which
    // positions generically by (x, y) and doesn't care what the ids are.
    const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
    const model = (wrapper.vm as any).previewMoonModel;
    const gridSpaceIds: Array<string> = model.spaces
      .filter((s: any) => s.spaceType !== SpaceType.COLONY)
      .map((s: any) => s.id);
    expect(gridSpaceIds).to.have.length(35);
    expect(gridSpaceIds.every((id) => /^m\d{2}$/.test(id))).is.true;
    // Matches MoonBoard.ts's own real numbering exactly (m01 reserved for Luna Trade Station).
    expect(gridSpaceIds[0]).to.eq('m02');
    expect(gridSpaceIds[gridSpaceIds.length - 1]).to.eq('m36');
  });

  describe('void tool', () => {
    it('clicking a hex with the void tool marks it voided and excludes it from the code', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      (wrapper.vm as any).tool = 'void:toggle';
      await wrapper.vm.$nextTick();
      await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');

      expect((wrapper.vm as any).grid[0].voided).is.true;
      expect(decodeSimpleBoard((wrapper.vm as any).code).spaces[0].voided).is.true;
    });

    it('clicking an already-voided hex with the void tool again restores it', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      (wrapper.vm as any).tool = 'void:toggle';
      await wrapper.vm.$nextTick();
      const hex = wrapper.findAll('.simple-map-editor-hex')[0];
      await hex.trigger('click');
      await hex.trigger('click');

      expect((wrapper.vm as any).grid[0].voided).to.eq(false);
    });

    it('painting any other tool on a voided hex implicitly restores it first', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      (wrapper.vm as any).tool = 'void:toggle';
      await wrapper.vm.$nextTick();
      const hex = wrapper.findAll('.simple-map-editor-hex')[0];
      await hex.trigger('click');
      expect((wrapper.vm as any).grid[0].voided).is.true;

      (wrapper.vm as any).tool = 'type:' + SpaceType.GASLIGHT;
      await wrapper.vm.$nextTick();
      await hex.trigger('click');

      expect((wrapper.vm as any).grid[0].voided).to.eq(false);
      expect((wrapper.vm as any).grid[0].spaceType).to.eq(SpaceType.GASLIGHT);
    });

    it('the preview omits a voided hex entirely, on both board types', async () => {
      for (const boardType of ['venusPhase2', 'moon'] as const) {
        const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType}});
        (wrapper.vm as any).tool = 'void:toggle';
        await wrapper.vm.$nextTick();
        await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');
        await wrapper.vm.$nextTick();

        const model = boardType === 'venusPhase2' ? (wrapper.vm as any).previewModel : (wrapper.vm as any).previewMoonModel;
        const gridSpaces = model.spaces.filter((s: any) => s.spaceType !== SpaceType.COLONY);
        const expectedCount = boardType === 'venusPhase2' ? 36 : 34;
        expect(gridSpaces).to.have.length(expectedCount);
      }
    });

    it('the export source emits .void() for a voided cell instead of terrain', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      (wrapper.vm as any).tool = 'void:toggle';
      await wrapper.vm.$nextTick();
      await wrapper.findAll('.simple-map-editor-hex')[0].trigger('click');
      await wrapper.vm.$nextTick();

      const source = (wrapper.vm as any).exportSource as string;
      expect(source).to.include('.void()');
    });
  });

  describe('backdrop calibration tool (Venus only)', () => {
    it('does not offer the backdrop tool for Moon', () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
      expect(wrapper.find('.simple-map-editor-backdrop-tools').exists()).is.false;
      expect(wrapper.find('.simple-map-editor-backdrop-drag').exists()).is.false;
    });

    it('starts at the real board\'s own shipped default and drives the CSS custom properties accordingly', () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      // Matches venusphase2.less's own var() fallback (0% 0% / 92%) -- see that file's comment
      // for how this exact value was calibrated with this same tool.
      expect(vm.backdropX).to.eq(0);
      expect(vm.backdropY).to.eq(0);
      expect(vm.backdropScale).to.eq(92);
      expect(vm.backdropStyleVars).to.deep.eq({
        '--venus-backdrop-position': '0% 0%',
        '--venus-backdrop-size': '92%',
      });
      expect(vm.backdropCss).to.eq('background-position: 0% 0%;\nbackground-size: 92%;');
    });

    it('scrolling over the backdrop scales it up/down, clamped to 50-300%', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const drag = wrapper.find('.simple-map-editor-backdrop-drag');

      await drag.trigger('wheel', {deltaY: -1});
      expect((wrapper.vm as any).backdropScale).to.eq(97); // 92 (default) + 5

      await drag.trigger('wheel', {deltaY: 1});
      await drag.trigger('wheel', {deltaY: 1});
      expect((wrapper.vm as any).backdropScale).to.eq(87); // 97 - 5 - 5

      (wrapper.vm as any).backdropScale = 300;
      await drag.trigger('wheel', {deltaY: -1});
      expect((wrapper.vm as any).backdropScale).to.eq(300); // clamped at the max

      (wrapper.vm as any).backdropScale = 50;
      await drag.trigger('wheel', {deltaY: 1});
      expect((wrapper.vm as any).backdropScale).to.eq(50); // clamped at the min
    });

    it('dragging the backdrop moves its position, clamped to 0-100%', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      const el = wrapper.find('.simple-map-editor-backdrop-drag').element as HTMLElement;
      // jsdom's getBoundingClientRect is all-zero by default -- stub a real size so the
      // pixel-delta-to-percent math has something to divide by.
      el.getBoundingClientRect = () => ({width: 200, height: 200, x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 200, toJSON: () => ({})});

      el.dispatchEvent(new MouseEvent('mousedown', {clientX: 100, clientY: 100, bubbles: true}));
      expect(vm.draggingBackdrop).is.true;

      window.dispatchEvent(new MouseEvent('mousemove', {clientX: 120, clientY: 100}));
      expect(vm.backdropX).to.eq(10); // +20px / 200px width = +10%, from a 0% start
      expect(vm.backdropY).to.eq(0); // unchanged

      window.dispatchEvent(new MouseEvent('mousemove', {clientX: 400, clientY: 100}));
      expect(vm.backdropX).to.eq(100); // would be +150% from a 0% start -- clamped at the max

      window.dispatchEvent(new MouseEvent('mouseup'));
      expect(vm.draggingBackdrop).is.false;

      // Further movement after mouseup shouldn't do anything -- the window listeners were removed.
      window.dispatchEvent(new MouseEvent('mousemove', {clientX: 0, clientY: 0}));
      expect(vm.backdropX).to.eq(100);
    });

    it('Reset restores the default alignment state', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      vm.backdropX = 10;
      vm.backdropY = 90;
      vm.backdropScale = 250;
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('.simple-map-editor-backdrop-tools button');
      const resetButton = buttons.find((b) => b.text() === 'Reset');
      await resetButton?.trigger('click');

      expect(vm.backdropX).to.eq(0);
      expect(vm.backdropY).to.eq(0);
      expect(vm.backdropScale).to.eq(92);
    });

    it('Copy backdrop CSS writes the current CSS to the clipboard', async () => {
      let written = '';
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            written = text;
            return Promise.resolve();
          },
        },
        configurable: true,
      });

      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      (wrapper.vm as any).backdropX = 33;
      (wrapper.vm as any).backdropScale = 150;
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('.simple-map-editor-backdrop-tools button');
      const copyButton = buttons.find((b) => b.text() === 'Copy backdrop CSS');
      await copyButton?.trigger('click');

      expect(written).to.eq('background-position: 33% 0%;\nbackground-size: 150%;');
      Object.defineProperty(navigator, 'clipboard', {value: originalClipboard, configurable: true});
    });
  });

  describe('30-60 track calibration tool (Venus only)', () => {
    it('does not offer the track tool for Moon', () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'moon'}});
      expect(wrapper.find('.simple-map-editor-track-calibrate').exists()).is.false;
    });

    it('starts empty, prompting for 30 first', () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      expect(vm.nextTrackValue).to.eq(30);
      expect(vm.trackValuesPlaced).to.deep.eq([]);
      expect(wrapper.text()).to.include('Next:');
      expect(wrapper.text()).to.include('30');
    });

    it('clicking the track records the next value at the clicked fraction, then advances', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      const el = wrapper.find('.simple-map-editor-track-calibrate').element as HTMLElement;
      // jsdom's getBoundingClientRect is all-zero by default -- stub a real size so the
      // pixel-to-fraction math has something to divide by.
      el.getBoundingClientRect = () => ({width: 200, height: 100, x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 100, toJSON: () => ({})});

      el.dispatchEvent(new MouseEvent('click', {clientX: 20, clientY: 80, bubbles: true}));
      await wrapper.vm.$nextTick();

      expect(vm.trackMarkers[30]).to.deep.eq({left: 0.1, top: 0.8});
      expect(vm.nextTrackValue).to.eq(32);

      el.dispatchEvent(new MouseEvent('click', {clientX: 100, clientY: 20, bubbles: true}));
      await wrapper.vm.$nextTick();

      expect(vm.trackMarkers[32]).to.deep.eq({left: 0.5, top: 0.2});
      expect(vm.nextTrackValue).to.eq(34);
    });

    it('Undo last removes only the most recently placed value', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      vm.trackMarkers = {30: {left: 0.1, top: 0.8}, 32: {left: 0.2, top: 0.6}};
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('.simple-map-editor-track-tools button');
      const undoButton = buttons.find((b) => b.text() === 'Undo last');
      await undoButton?.trigger('click');

      expect(vm.trackMarkers[30]).to.deep.eq({left: 0.1, top: 0.8});
      expect(vm.trackMarkers[32]).to.be.undefined;
      expect(vm.nextTrackValue).to.eq(32);
    });

    it('Reset clears every placed marker', async () => {
      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      vm.trackMarkers = {30: {left: 0.1, top: 0.8}, 32: {left: 0.2, top: 0.6}};
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('.simple-map-editor-track-tools button');
      const resetButton = buttons.find((b) => b.text() === 'Reset');
      await resetButton?.trigger('click');

      expect(vm.trackMarkers).to.deep.eq({});
      expect(vm.nextTrackValue).to.eq(30);
    });

    it('Copy positions writes VenusSurfaceBoard.vue-shaped code to the clipboard', async () => {
      let written = '';
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            written = text;
            return Promise.resolve();
          },
        },
        configurable: true,
      });

      const wrapper = mount(SimpleMapEditor, {...globalConfig, props: {boardType: 'venusPhase2'}});
      const vm = wrapper.vm as any;
      vm.trackMarkers = {32: {left: 0.234, top: 0.567}, 30: {left: 0.1, top: 0.8}};
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('.simple-map-editor-track-tools button');
      const copyButton = buttons.find((b) => b.text() === 'Copy positions');
      await copyButton?.trigger('click');

      // Sorted ascending regardless of the (out-of-order, here) insertion order above.
      expect(written).to.eq('  30: {left: 0.100, top: 0.800},\n  32: {left: 0.234, top: 0.567},');
      Object.defineProperty(navigator, 'clipboard', {value: originalClipboard, configurable: true});
    });
  });
});
