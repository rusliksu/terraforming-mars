import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import MapEditor from '@/client/components/MapEditor.vue';
import {decodeCustomBoard, encodeCustomBoard} from '@/common/boards/customBoardCodec';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';
import {SpaceType} from '@/common/boards/SpaceType';

describe('MapEditor', () => {
  describe('?board= mode switch', () => {
    afterEach(() => {
      window.history.pushState(null, '', '/');
    });

    it('renders the Mars editor when there is no ?board= param', () => {
      const wrapper = mount(MapEditor, {...globalConfig});
      expect(wrapper.find('.map-editor').exists()).is.true;
      expect(wrapper.find('.simple-map-editor').exists()).is.false;
    });

    it('the Mars editor links to both the Moon and Venus editors', () => {
      const wrapper = mount(MapEditor, {...globalConfig});
      const links = wrapper.findAll('.map-editor-board-nav a').map((a) => a.attributes('href'));
      expect(links).to.include('map-editor?board=moon');
      expect(links).to.include('map-editor?board=venus');
    });

    it('renders SimpleMapEditor for ?board=venus', () => {
      window.history.pushState(null, '', '/map-editor?board=venus');
      const wrapper = mount(MapEditor, {...globalConfig});
      expect(wrapper.find('.simple-map-editor').exists()).is.true;
      expect(wrapper.find('.map-editor').exists()).is.false;
    });

    it('renders SimpleMapEditor for ?board=moon', () => {
      window.history.pushState(null, '', '/map-editor?board=moon');
      const wrapper = mount(MapEditor, {...globalConfig});
      expect(wrapper.find('.simple-map-editor').exists()).is.true;
    });

    it('falls back to the Mars editor for an unrecognized ?board= value', () => {
      window.history.pushState(null, '', '/map-editor?board=jupiter');
      const wrapper = mount(MapEditor, {...globalConfig});
      expect(wrapper.find('.map-editor').exists()).is.true;
    });
  });

  it('mounts with a full 9-row hexagon and a valid code', () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const hexes = wrapper.findAll('.map-editor-hex');
    expect(hexes.length).to.eq(61);
    const code = (wrapper.vm as any).code as string;
    expect(code.startsWith('TMB3')).to.be.true;
    expect(decodeCustomBoard(code).spaces).to.have.length(61);
  });

  it('painting a hex changes its type in the generated code', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    // Default tool is 'type:ocean'.
    await wrapper.findAll('.map-editor-hex')[0].trigger('click');
    const decoded = decodeCustomBoard((wrapper.vm as any).code);
    expect(decoded.spaces[0].spaceType).to.eq(SpaceType.OCEAN);
  });

  it('the void tool removes a space from the definition', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    (wrapper.vm as any).tool = 'flag:void';
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.map-editor-hex')[0].trigger('click');
    expect(decodeCustomBoard((wrapper.vm as any).code).spaces).to.have.length(60);
  });

  it('Load rebuilds the editor from a pasted code', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const source = blankCustomBoard(5, 'Loaded');
    source.spaces[0].spaceType = SpaceType.OCEAN;

    (wrapper.vm as any).loadInput = encodeCustomBoard(source);
    (wrapper.vm as any).loadCode();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).rows).to.eq(5);
    expect((wrapper.vm as any).name).to.eq('Loaded');
    expect(wrapper.findAll('.map-editor-hex').length).to.eq(19);
    expect(decodeCustomBoard((wrapper.vm as any).code)).to.deep.eq(source);
  });

  it('Load preserves void cells (does not re-fill carved holes with land)', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const source = blankCustomBoard(9, 'Carved');
    // Drop two cells and renumber to what the codec produces.
    source.spaces.splice(5, 1);
    source.spaces.splice(20, 1);
    source.spaces.forEach((s, i) => (s.id = blankCustomBoard(9, '').spaces[i].id));

    (wrapper.vm as any).loadInput = encodeCustomBoard(source);
    (wrapper.vm as any).loadCode();
    await wrapper.vm.$nextTick();

    const reencoded = decodeCustomBoard((wrapper.vm as any).code);
    expect(reencoded.spaces).to.have.length(59);
    expect(reencoded).to.deep.eq(source);
  });

  it('separates terrain, markers and placement bonuses, with descriptions', () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const legends = wrapper.findAll('.map-editor-tools legend').map((l) => l.text());
    expect(legends).to.include.members(['Terrain', 'Markers', 'Placement bonuses']);
    // Every tool label carries a description tooltip.
    const toolLabels = wrapper.findAll('.map-editor-tools label');
    expect(toolLabels.length).to.be.greaterThan(10);
    expect(toolLabels.every((l) => (l.attributes('title') ?? '').length > 10)).to.be.true;
  });

  it('renders bonus tools with the real board sprite classes, not emoji', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const icons = wrapper.findAll('.map-editor-bonus-icon');
    expect(icons.length).to.be.greaterThan(5);
    expect(icons.some((i) => i.classes().includes('board-space-bonus--heat'))).to.be.true;
    expect(icons.some((i) => i.classes().includes('board-space-bonus--card'))).to.be.true;

    // A painted hex shows a sprite element, not a text glyph.
    (wrapper.vm as any).tool = 'bonus:' + 4; // HEAT
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.map-editor-hex')[0].trigger('click');
    const hexBonus = wrapper.findAll('.map-editor-hex')[0].find('.map-editor-hex-bonus');
    expect(hexBonus.exists()).to.be.true;
    expect(hexBonus.classes()).to.include('board-space-bonus--heat');
  });

  it('offers the fixed-4M€ temperature bonus (Vastitas Borealis Nova) as its own paintable, stackable tool', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const vm = wrapper.vm as any;
    const hex = () => wrapper.findAll('.map-editor-hex')[0];

    // The palette offers it distinctly from the regular (configurable-cost) Temperature tool.
    const icons = wrapper.findAll('.map-editor-bonus-icon');
    expect(icons.some((i) => i.classes().includes('board-space-bonus--bonustemperature4mc'))).to.be.true;

    vm.tool = 'bonus:' + 18; // TEMPERATURE_4MC
    await wrapper.vm.$nextTick();
    await hex().trigger('click');
    await hex().trigger('click');
    expect(decodeCustomBoard(vm.code).spaces[0].bonus).to.deep.eq([18, 18]);

    const hexBonus = hex().find('.map-editor-hex-bonus');
    expect(hexBonus.classes()).to.include('board-space-bonus--bonustemperature4mc');
  });

  it('stacks placement bonuses in any combination', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const vm = wrapper.vm as any;
    const hex = () => wrapper.findAll('.map-editor-hex')[0];

    vm.tool = 'bonus:' + 2; // PLANT
    await wrapper.vm.$nextTick();
    await hex().trigger('click');
    await hex().trigger('click'); // two plants
    vm.tool = 'bonus:' + 4; // HEAT
    await wrapper.vm.$nextTick();
    await hex().trigger('click');

    let space = decodeCustomBoard(vm.code).spaces[0];
    expect(space.bonus).to.deep.eq([2, 2, 4]);

    // Right-click removes the last one.
    await hex().trigger('contextmenu');
    space = decodeCustomBoard(vm.code).spaces[0];
    expect(space.bonus).to.deep.eq([2, 2]);

    // Clear tool empties the hex.
    vm.tool = 'bonus:clear';
    await wrapper.vm.$nextTick();
    await hex().trigger('click');
    expect(decodeCustomBoard(vm.code).spaces[0].bonus).to.deep.eq([]);
  });

  it('collapses repeated M€ placement bonuses into one icon with a count badge', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const vm = wrapper.vm as any;
    const hex = () => wrapper.findAll('.map-editor-hex')[0];

    vm.tool = 'bonus:' + 6; // MEGACREDITS
    await wrapper.vm.$nextTick();
    await hex().trigger('click');
    await hex().trigger('click'); // 2 M€

    expect(decodeCustomBoard(vm.code).spaces[0].bonus).to.deep.eq([6, 6]);

    const bonusIcons = hex().findAll('.map-editor-hex-bonus');
    expect(bonusIcons.length).to.eq(1);
    expect(bonusIcons[0].classes()).to.include('board-space-bonus--megacredit');
    expect(bonusIcons[0].find('.map-editor-hex-bonus-count').text()).to.eq('2');
  });

  it('shows "1" on the coin for a single M€ placement bonus too (the icon itself is blank)', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const vm = wrapper.vm as any;
    const hex = () => wrapper.findAll('.map-editor-hex')[0];

    vm.tool = 'bonus:' + 6; // MEGACREDITS
    await wrapper.vm.$nextTick();
    await hex().trigger('click');

    const bonusIcons = hex().findAll('.map-editor-hex-bonus');
    expect(bonusIcons[0].find('.map-editor-hex-bonus-count').text()).to.eq('1');
  });

  it('paints terrain with the real board sprite classes', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const vm = wrapper.vm as any;
    const hex = () => wrapper.findAll('.map-editor-hex')[0];

    vm.tool = 'type:ocean';
    await wrapper.vm.$nextTick();
    await hex().trigger('click');
    expect(hex().classes()).to.include('board-space-type-ocean');

    vm.tool = 'flag:volcanic';
    await wrapper.vm.$nextTick();
    vm.tool = 'type:land';
    await wrapper.vm.$nextTick();
    await hex().trigger('click'); // land, not volcanic yet
    vm.tool = 'flag:volcanic';
    await wrapper.vm.$nextTick();
    await hex().trigger('click');
    expect(hex().classes()).to.include.members(['board-space-type-land', 'board-space-type-land-volcanic']);

    vm.tool = 'flag:void';
    await wrapper.vm.$nextTick();
    await hex().trigger('click');
    expect(hex().classes()).to.include('map-editor-hex--void');
    expect(hex().classes()).to.not.include('board-space-type-land');
  });

  it('caps milestone selection at 5', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.milestones = ['Terraformer', 'Mayor', 'Gardener', 'Planner', 'Builder'];
    await wrapper.vm.$nextTick();
    const disabled = wrapper.findAll('.map-editor-ma input[type=checkbox]')
      .filter((c) => (c.element as HTMLInputElement).disabled);
    // All unchecked milestone boxes are disabled once 5 are chosen.
    expect(disabled.length).to.be.greaterThan(0);
  });

  it('shows a bump icon matching its kind, and updates it when the kind is changed', async () => {
    const wrapper = mount(MapEditor, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.customParams = true;
    await wrapper.vm.$nextTick();
    vm.params.temperature.bonuses.push({value: -24, kind: 'heatProduction', amount: 1});
    await wrapper.vm.$nextTick();

    const icon = wrapper.find('.map-editor-bump-icon');
    expect(icon.classes()).to.include('map-editor-bump-icon--heatProduction');

    await wrapper.find('.map-editor-bump select').setValue('tr');
    expect(wrapper.find('.map-editor-bump-icon').classes()).to.include('map-editor-bump-icon--tr');
    expect(wrapper.find('.map-editor-bump-icon').classes()).to.not.include('map-editor-bump-icon--heatProduction');
  });

  describe('opening a Map Library entry (MapLibraryRow.vue\'s "Open in editor" hand-off)', () => {
    afterEach(() => {
      window.history.pushState(null, '', '/');
      try {
        window.localStorage?.removeItem('mapEditorLoadCode');
      } catch (e) { /* ignore */ }
    });

    it('loads the stashed code on mount when the URL says ?loadCode=1', () => {
      const source = blankCustomBoard(5, 'From The Library');
      source.spaces[0].spaceType = SpaceType.OCEAN;
      window.localStorage.setItem('mapEditorLoadCode', encodeCustomBoard(source));
      window.history.pushState(null, '', '/map-editor?loadCode=1');

      const wrapper = mount(MapEditor, {...globalConfig});
      const vm = wrapper.vm as any;

      expect(vm.rows).to.eq(5);
      expect(vm.name).to.eq('From The Library');
      expect(decodeCustomBoard(vm.code)).to.deep.eq(source);
    });

    it('does nothing when the URL has no ?loadCode=1, even if something is stashed', () => {
      window.localStorage.setItem('mapEditorLoadCode', encodeCustomBoard(blankCustomBoard(5, 'Ignore Me')));

      const wrapper = mount(MapEditor, {...globalConfig});
      const vm = wrapper.vm as any;

      expect(vm.name).to.not.eq('Ignore Me');
    });

    it('surfaces a load error instead of crashing on a corrupt stashed code', () => {
      window.localStorage.setItem('mapEditorLoadCode', 'not a real code');
      window.history.pushState(null, '', '/map-editor?loadCode=1');

      const wrapper = mount(MapEditor, {...globalConfig});
      const vm = wrapper.vm as any;

      expect(vm.loadError).to.not.eq('');
    });
  });

  describe('submitting to the Map Library', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('posts the live editor code, description, and submitter, then shows success', async () => {
      let sentBody: any;
      global.fetch = ((_url: string, init: any) => {
        sentBody = JSON.parse(init.body);
        return Promise.resolve({ok: true, status: 200, json: () => Promise.resolve({entry: {}})} as Response);
      }) as typeof fetch;

      const wrapper = mount(MapEditor, {...globalConfig});
      const vm = wrapper.vm as any;
      await wrapper.find('.map-editor-submit textarea').setValue('a fine map');
      await wrapper.find('.map-editor-submit input[type=text]').setValue('me');
      await wrapper.find('.map-editor-submit button.btn-primary').trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sentBody).to.deep.eq({code: vm.code, description: 'a fine map', submittedBy: 'me'});
      expect(wrapper.text()).to.contain('Submitted!');
    });

    it('shows a clear message when rate-limited', async () => {
      global.fetch = (() => Promise.resolve({ok: false, status: 429} as Response)) as typeof fetch;
      const wrapper = mount(MapEditor, {...globalConfig});
      await wrapper.find('.map-editor-submit button.btn-primary').trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(wrapper.text()).to.contain('too quickly');
    });
  });
});
