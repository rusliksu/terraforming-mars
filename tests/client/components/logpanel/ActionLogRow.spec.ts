import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import ActionLogRow from '@/client/components/logpanel/ActionLogRow.vue';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {GlobalParameter} from '@/common/GlobalParameter';
import {fakePublicPlayerModel, fakeViewModel} from '../testHelpers';
import {globalConfig} from '../getLocalVue';

describe('ActionLogRow', () => {
  it('shows global track changes with actual units and the affected player', () => {
    const action = new LogMessage(LogMessageType.DEFAULT, 'Red played a card', [
      {type: LogMessageDataType.PLAYER, value: 'red'},
    ]);
    action.replayGlobalEffects = [
      {kind: 'global', parameter: GlobalParameter.OXYGEN, amount: 1, player: 'blue'},
      {kind: 'global', parameter: GlobalParameter.TEMPERATURE, amount: 1, player: 'blue'},
      {kind: 'global', parameter: GlobalParameter.VENUS, amount: 1, player: 'blue'},
    ];
    const entry = {kind: 'action' as const, id: 'global-action', messages: [action], complete: true};
    const wrapper = shallowMount(ActionLogRow, {
      ...globalConfig,
      props: {entry, viewModel: fakeViewModel({players: [
        fakePublicPlayerModel({color: 'red', name: 'Red'}),
        fakePublicPlayerModel({color: 'blue', name: 'Дамир'}),
      ]})},
    });

    expect(wrapper.findAll('.action-log-effect-amount').map((amount) => amount.text())).deep.eq(['+1%', '+2°C', '+2%']);
    expect(wrapper.findAll('.action-log-effect').map((effect) => effect.attributes('aria-label'))).deep.eq([
      '+1% oxygen · Дамир', '+2°C temperature · Дамир', '+2% Venus scale · Дамир',
    ]);
    expect(wrapper.findAll('.action-log-global-icon').map((icon) => icon.attributes('src'))).deep.eq([
      '/assets/global-parameters/oxygen.png',
      '/assets/global-parameters/temperature.png',
      '/assets/global-parameters/venus.png',
    ]);
    expect(wrapper.findAll('.action-log-global-icon').map((icon) => icon.attributes('alt'))).deep.eq(['', '', '']);
    expect(wrapper.findAll('.action-log-target').map((target) => target.classes().includes('player_bg_color_blue'))).deep.eq([true, true, true]);
  });

  it('shows an applied resource result and expands the remaining original message', async () => {
    const action = new LogMessage(LogMessageType.DEFAULT, 'Blue played a card', []);
    const gained = new LogMessage(LogMessageType.DEFAULT, 'Blue gained 2 steel', []);
    gained.effect = {kind: 'resource', resource: 'steel', production: false, amount: 2, player: 'blue'};
    const entry = {kind: 'action' as const, id: 'action-1', messages: [action, gained], complete: true};
    const wrapper = shallowMount(ActionLogRow, {
      ...globalConfig,
      props: {entry, viewModel: fakeViewModel({players: [fakePublicPlayerModel({color: 'blue', name: 'Blue'})]})},
    });

    expect(wrapper.text()).to.contain('+2');
    expect(wrapper.find('.action-log-payment').exists()).is.false;
    expect(wrapper.find('.resource_icon--steel').exists()).to.be.true;
    expect(wrapper.findAllComponents(LogMessageComponent)).to.have.length(1);
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('button').attributes('aria-expanded')).eq('true');
    expect(wrapper.findAllComponents(LogMessageComponent)).to.have.length(2);
  });

  it('shows recorded card costs before gains, including each paid resource', () => {
    const action = new LogMessage(LogMessageType.DEFAULT, 'Blue played a card', []);
    action.payment = {megacredits: 14, steel: 2, titanium: 1};
    const gained = new LogMessage(LogMessageType.DEFAULT, 'Blue gained 2 steel', []);
    gained.effect = {kind: 'resource', resource: 'steel', production: false, amount: 2, player: 'blue'};
    const entry = {kind: 'action' as const, id: 'action-payment', messages: [action, gained], complete: true};
    const wrapper = shallowMount(ActionLogRow, {
      ...globalConfig,
      props: {entry, viewModel: fakeViewModel({players: [fakePublicPlayerModel({color: 'blue', name: 'Blue'})]})},
    });

    expect(wrapper.findAll('.action-log-payment').map((chip) => chip.attributes('aria-label')))
      .deep.eq(['Paid 14 megacredits', 'Paid 2 steel', 'Paid 1 titanium']);
    expect(wrapper.findAll('.action-log-payment').map((chip) => chip.text())).deep.eq(['−14', '−2', '−1']);
    expect(wrapper.get('.action-log-effects').element.firstElementChild?.classList.contains('action-log-payment')).is.true;
    expect(wrapper.get('.action-log-effect').text()).to.contain('+2');
  });

  it('shows the exact energy spent on a later trade message before its gain', () => {
    const action = new LogMessage(LogMessageType.DEFAULT, 'Blue played Trade Advance', []);
    const trade = new LogMessage(LogMessageType.DEFAULT, 'Blue traded with Luna', []);
    trade.payment = {megacredits: 0, steel: 0, titanium: 0, energy: 3};
    const gained = new LogMessage(LogMessageType.DEFAULT, 'Blue gained 17 M€', []);
    gained.effect = {kind: 'resource', resource: 'megacredits', production: false, amount: 17, player: 'blue'};
    const entry = {kind: 'action' as const, id: 'action-trade', messages: [action, trade, gained], complete: true};
    const wrapper = shallowMount(ActionLogRow, {
      ...globalConfig,
      props: {entry, viewModel: fakeViewModel({players: [fakePublicPlayerModel({color: 'blue', name: 'Blue'})]})},
    });

    expect(wrapper.get('.action-log-payment').attributes('aria-label')).eq('Paid 3 energy');
    expect(wrapper.find('.action-log-payment .resource_icon--energy').exists()).is.true;
    expect(wrapper.get('.action-log-effects').element.firstElementChild?.classList.contains('action-log-payment')).is.true;
    expect(wrapper.get('.action-log-effect').text()).to.contain('+17');
  });

  it('shows a logged ocean bonus as coins and frames production', () => {
    const action = new LogMessage(LogMessageType.DEFAULT, 'Blue played Great Dam', []);
    const production = new LogMessage(LogMessageType.DEFAULT, 'Blue gained 2 energy production', []);
    production.effect = {kind: 'resource', resource: 'energy', production: true, amount: 2, player: 'blue'};
    const oceanBonus = new LogMessage(LogMessageType.DEFAULT, '${0} gained ${1} M€ from ${2} ocean(s)', [
      {type: LogMessageDataType.PLAYER, value: 'blue'},
      {type: LogMessageDataType.RAW_STRING, value: '6'},
      {type: LogMessageDataType.RAW_STRING, value: '3'},
    ]);
    const entry = {kind: 'action' as const, id: 'action-2', messages: [action, production, oceanBonus], complete: true};
    const wrapper = shallowMount(ActionLogRow, {
      ...globalConfig,
      props: {entry, viewModel: fakeViewModel({players: [fakePublicPlayerModel({color: 'blue', name: 'Blue'})]})},
    });

    expect(wrapper.findAll('.action-log-effect')).to.have.length(2);
    expect(wrapper.find('.action-log-production-box .resource_icon--energy').exists()).to.be.true;
    expect(wrapper.get('.resource_icon--megacredits').element.parentElement?.textContent).to.contain('+6');
    expect(wrapper.get('.action-log-source').text()).eq('🌊×3');
    expect(wrapper.findAll('.action-log-effect')[1].attributes('aria-label')).eq('+6 megacredits from 3 ocean(s) · Blue');
  });

  it('names the affected player beside a signed TR change', () => {
    const action = new LogMessage(LogMessageType.DEFAULT, 'Red played a card', [
      {type: LogMessageDataType.PLAYER, value: 'red'},
    ]);
    const changed = new LogMessage(LogMessageType.DEFAULT, 'Damir lost 1 TR', []);
    changed.effect = {kind: 'tr', amount: -1, player: 'blue'};
    const entry = {kind: 'action' as const, id: 'action-3', messages: [action, changed], complete: true};
    const wrapper = shallowMount(ActionLogRow, {
      ...globalConfig,
      props: {entry, viewModel: fakeViewModel({players: [
        fakePublicPlayerModel({color: 'red', name: 'Red'}),
        fakePublicPlayerModel({color: 'blue', name: 'Дамир'}),
      ]})},
    });

    expect(wrapper.find('.resource_icon--rating').exists()).to.be.true;
    expect(wrapper.get('.action-log-effect').attributes('aria-label')).eq('-1 TR · Дамир');
    expect(wrapper.get('.action-log-target').text()).eq('Дамир');
    expect(wrapper.get('.action-log-target').classes()).to.include('log-player');
    expect(wrapper.get('.action-log-target').classes()).to.include('player_bg_color_blue');
  });

  it('links a logged tile location from the collapsed action to its board space', async () => {
    const action = new LogMessage(LogMessageType.DEFAULT, 'Blue played Great Dam', []);
    const placement = new LogMessage(LogMessageType.DEFAULT, '${0} ${1} ${2} at ${3}', [
      {type: LogMessageDataType.PLAYER, value: 'blue'},
      {type: LogMessageDataType.RAW_STRING, value: 'placed'},
      {type: LogMessageDataType.RAW_STRING, value: 'ocean tile'},
      {type: LogMessageDataType.SPACE, value: '43'},
    ]);
    const entry = {kind: 'action' as const, id: 'action-4', messages: [action, placement], complete: true};
    const wrapper = shallowMount(ActionLogRow, {
      ...globalConfig,
      props: {entry, viewModel: fakeViewModel({players: [fakePublicPlayerModel({color: 'blue', name: 'Blue'})]})},
    });

    expect(wrapper.get('.action-log-location').text()).to.contain('F6');
    expect(wrapper.findAllComponents(LogMessageComponent)).to.have.length(1);
    await wrapper.get('.action-log-location').trigger('click');
    expect(wrapper.emitted('spaceClicked')?.[0]).to.deep.equal(['43']);
  });
});
