import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import {TemplateManager} from '@/client/components/create/TemplateManager';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';
import {encodeCustomBoard} from '@/common/boards/customBoardCodec';
import {blankSimpleBoard} from '@/common/boards/SimpleCustomBoardDefinition';
import {encodeSimpleBoard} from '@/common/boards/simpleBoardCodec';
import {BoardName} from '@/common/boards/BoardName';
import {CardName} from '@/common/cards/CardName';
import PreludesFilter from '@/client/components/create/PreludesFilter.vue';

describe('Fanmade setup in the custom form', () => {
  beforeEach(() => {
    global.localStorage = window.localStorage;
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  it('removes disabled fan corporations from the custom list', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const vm = wrapper.vm as any;
    vm.expansions.sillyfication = true;
    vm.showCorporationList = true;
    await wrapper.vm.$nextTick();
    expect(vm.customCorporations).includes(CardName.WELLNESS_DELUXE);
    vm.expansions.sillyfication = false;
    await wrapper.vm.$nextTick();
    expect(vm.customCorporations).not.includes(CardName.WELLNESS_DELUXE);
  });

  it('replaces the original prelude in setup when BetterMars is available', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const vm = wrapper.vm as any;
    vm.expansions.prelude = true;
    vm.expansions.pathfinders = true;
    vm.showPreludesList = true;
    await wrapper.vm.$nextTick();
    vm.expansions.betterMars = true;
    await wrapper.vm.$nextTick();
    const filter = wrapper.findComponent(PreludesFilter);
    expect(filter.props('selectable')).includes(CardName.EARLY_SETTLEMENT_BETTER_MARS);
    expect(filter.props('selectable')).not.includes(CardName.EARLY_SETTLEMENT);
    expect(filter.props('selected')).includes(CardName.EARLY_SETTLEMENT_BETTER_MARS);
    expect(filter.props('selected')).not.includes(CardName.EARLY_SETTLEMENT);

    vm.expansions.pathfinders = false;
    await wrapper.vm.$nextTick();
    expect(filter.props('selectable')).includes(CardName.EARLY_SETTLEMENT);
    expect(filter.props('selectable')).not.includes(CardName.EARLY_SETTLEMENT_BETTER_MARS);
    expect(filter.props('selected')).includes(CardName.EARLY_SETTLEMENT);
    expect(filter.props('selected')).not.includes(CardName.EARLY_SETTLEMENT_BETTER_MARS);
  });

  it('round-trips all custom board codes through templates and clears them on reset', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const vm = wrapper.vm as any;
    const mars = encodeCustomBoard(blankCustomBoard(9, 'Template Mars'));
    const moon = encodeSimpleBoard(blankSimpleBoard('moon', 'Template Moon'));
    const venus = encodeSimpleBoard(blankSimpleBoard('venusPhase2', 'Template Venus'));
    vm.customBoardCodeInput = mars;
    vm.applyCustomBoardCode();
    vm.customMoonBoardCodeInput = moon;
    vm.applyCustomMoonBoardCode();
    vm.customVenusSurfaceBoardCodeInput = venus;
    vm.applyCustomVenusSurfaceBoardCode();
    const settings = TemplateManager.serializeFormState(vm);
    expect(settings.customBoardCode).eq(mars);
    expect(settings.customMoonBoardCode).eq(moon);
    expect(settings.customVenusSurfaceBoardCode).eq(venus);
    vm.resetSettings();
    await wrapper.vm.$nextTick();
    expect(vm.customBoardCodeInput).eq('');
    expect(vm.customMoonBoardCodeInput).eq('');
    expect(vm.customVenusSurfaceBoardCodeInput).eq('');
    vm.applySettings(settings);
    await wrapper.vm.$nextTick();
    expect(vm.board).eq(BoardName.CUSTOM);
    expect(vm.customBoardName).eq('Template Mars');
    expect(vm.customMoonBoardName).eq('Template Moon');
    expect(vm.customVenusSurfaceBoardName).eq('Template Venus');
  });

  it('preserves imported teams instead of recomputing table-order pairing', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const vm = wrapper.vm as any;
    const settings = TemplateManager.serializeFormState({...defaultCreateGameModel(), playersCount: 4});
    const teams = [0, 0, 1, 1];
    (settings.players as Array<any>).forEach((p, i) => {
      p.team = teams[i];
    });
    settings.expansions = {...defaultCreateGameModel().expansions, conglomerates: true};
    vm.applySettings(settings);
    await wrapper.vm.$nextTick();
    expect(vm.getPlayers().map((p: any) => p.team)).deep.eq(teams);
  });

  it('assigns unique individual colors across three teams', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const vm = wrapper.vm as any;
    vm.playersCount = 6;
    vm.expansions.conglomerates = true;
    await wrapper.vm.$nextTick();
    expect(new Set(vm.getPlayers().map((p: any) => p.color)).size).eq(6);
  });

  it('keeps team-controlled colors when a player profile is selected', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const vm = wrapper.vm as any;
    vm.playersCount = 4;
    vm.expansions.conglomerates = true;
    await wrapper.vm.$nextTick();
    const player = vm.players[0];
    const color = player.color;
    vm.applyPlayerProfile(player, {id: 'test-profile', name: 'Test profile', aliases: [], preferredColor: 'black'});
    expect(player.color).eq(color);
  });
  it('clears custom-list overrides before selecting enabled defaults again', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const vm = wrapper.vm as any;
    vm.expansions.sillyfication = true;
    vm.showCorporationList = true;
    await wrapper.vm.$nextTick();
    vm.customCorporationExclusions = [CardName.WELLNESS_DELUXE];
    vm.clearCustomLists();
    await wrapper.vm.$nextTick();
    expect(vm.showCorporationList).is.false;
    vm.showCorporationList = true;
    await wrapper.vm.$nextTick();
    expect(vm.customCorporations).includes(CardName.WELLNESS_DELUXE);
  });
});
