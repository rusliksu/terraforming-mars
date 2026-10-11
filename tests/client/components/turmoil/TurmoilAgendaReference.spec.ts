import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import TurmoilAgendaReference from '@/client/components/turmoil/TurmoilAgendaReference.vue';
import {PartyName} from '@/common/turmoil/PartyName';
import {Agenda} from '@/common/turmoil/Types';

const parties: Array<{name: PartyName; agenda: Agenda}> = [
  {name: PartyName.SCIENTISTS, agenda: {bonusId: 'sb02', policyId: 'sp01'}},
  {name: PartyName.GREENS, agenda: {bonusId: 'gb01', policyId: 'gp04'}},
];

describe('TurmoilAgendaReference', () => {
  it('lists every More Parties party and marks only the agendas currently in play', async () => {
    const currentParties: Array<{name: PartyName; agenda: Agenda}> = [
      {name: PartyName.BUREAUCRATS, agenda: {bonusId: 'burb01', policyId: 'burp02'}},
      {name: PartyName.KELVINISTS, agenda: {bonusId: 'kb02', policyId: 'kp03'}},
      {name: PartyName.GREENS, agenda: {bonusId: 'gb02', policyId: 'gp03'}},
      {name: PartyName.MARS, agenda: {bonusId: 'mb01', policyId: 'mp02'}},
      {name: PartyName.REDS, agenda: {bonusId: 'rb02', policyId: 'rp03'}},
      {name: PartyName.UNITY, agenda: {bonusId: 'ub01', policyId: 'up02'}},
    ];
    const wrapper = mount(TurmoilAgendaReference, {
      ...globalConfig,
      props: {parties: currentParties, rulingParty: PartyName.GREENS, agendaStyle: 'PartyLeaders', morePartiesExpansion: true},
    });
    expect(wrapper.findAll('button .party-name').map((party) => party.text())).to.deep.eq([
      'Mars First', 'Scientists', 'Unity', 'Kelvinists', 'Reds', 'Greens',
      'Populists', 'Spome', 'Empower', 'Bureaucrats', 'Centrists', 'Transhumanists',
    ]);
    expect(wrapper.findAll('.agenda-reference-in-play')).to.have.length(6);
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['gb02', 'gp03']);

    await wrapper.findAll('button')[8].trigger('click');
    expect(wrapper.findAll('[data-agenda-id]').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['empb01', 'empb02', 'empp01', 'empp02', 'empp03', 'empp04']);
    expect(wrapper.text()).to.contain('Gain 1 M€ for every energy production level you have');
    expect(wrapper.text()).to.contain('You may use energy as M€ (2 M€ per energy)');
    expect(wrapper.findAll('.agenda-reference-current')).to.have.length(0);
    expect(wrapper.text()).to.contain('This party is not in play');

    await wrapper.setProps({parties: currentParties.slice(1).concat([
      {name: PartyName.EMPOWER, agenda: {bonusId: 'empb02', policyId: 'empp04'}},
    ])});
    expect(wrapper.findAll('.agenda-reference-in-play')).to.have.length(6);
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['empb02', 'empp04']);
    expect(wrapper.text()).not.to.contain('This party is not in play');
  });

  it('shows the ruling party options and switches only between parties in play', async () => {
    const wrapper = mount(TurmoilAgendaReference, {
      ...globalConfig,
      props: {parties, rulingParty: PartyName.SCIENTISTS, agendaStyle: 'Chairman', morePartiesExpansion: false},
    });
    expect(wrapper.findAll('button').map((button) => button.text())).to.deep.eq(['Scientists', 'Greens']);
    expect(wrapper.findAll('[data-agenda-id]').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['sb01', 'sb02', 'sp01', 'sp02', 'sp03', 'sp04']);
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['sb02', 'sp01']);
    expect(wrapper.text()).to.contain('Pay 10 M€ to draw 3 cards');
    expect(wrapper.text()).to.contain('choose either a bonus or a policy');
    expect(wrapper.find('[data-agenda-id="sb01"] .tag-science').exists()).is.true;

    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.findAll('button')[1].attributes('aria-pressed')).to.eq('true');
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['gb01', 'gp04']);
    expect(wrapper.find('[data-agenda-id="sp01"]').exists()).is.false;
  });

  it('uses More Parties descriptions and updates when a selected party leaves play', async () => {
    const wrapper = mount(TurmoilAgendaReference, {
      ...globalConfig,
      props: {parties, agendaStyle: 'Chairman', morePartiesExpansion: true},
    });
    expect(wrapper.text()).to.contain('All players are considered having 2 more science tags');
    expect(wrapper.text()).not.to.contain('Pay 10 M€ to draw 3 cards');
    expect(wrapper.text()).not.to.contain('choose either a bonus or a policy');

    await wrapper.setProps({parties: [{name: PartyName.SPOME, agenda: {bonusId: 'spob02', policyId: 'spop03'}}]});
    expect(wrapper.findAll('button')).to.have.length(12);
    expect(wrapper.find('button[aria-pressed="true"] .party-name').text()).to.eq('Spome');
    expect(wrapper.findAll('[data-agenda-id]').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob01', 'spob02', 'spop01', 'spop02', 'spop03', 'spop04']);
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob02', 'spop03']);

    await wrapper.setProps({parties: [{name: PartyName.SPOME, agenda: {bonusId: 'spob01', policyId: 'spop02'}}]});
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob01', 'spop02']);
  });

  it('keeps the current policy overview for ordinary Turmoil and opens the full More Parties reference', async () => {
    const wrapper = mount(TurmoilAgendaReference, {
      ...globalConfig,
      props: {parties, agendaStyle: 'Random', morePartiesExpansion: false},
    });
    expect(wrapper.findAll('[data-agenda-id]').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['sp01', 'gp04']);
    expect(wrapper.findAll('.party-name').map((party) => party.text())).to.deep.eq(['Scientists', 'Greens']);
    expect(wrapper.findAll('button')).to.have.length(0);
    expect(wrapper.text()).not.to.contain('Available bonuses');
    expect(wrapper.text()).not.to.contain('Available policies');
    await wrapper.setProps({agendaStyle: 'PartyLeaders', morePartiesExpansion: true,
      parties: [{name: PartyName.SPOME, agenda: {bonusId: 'spob01', policyId: 'spop02'}}]});
    expect(wrapper.findAll('[data-agenda-id]').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob01', 'spob02', 'spop01', 'spop02', 'spop03', 'spop04']);
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob01', 'spop02']);
    expect(wrapper.text()).to.contain('Every time you place a lunar habitat tile, gain 4 M€');
  });

  it('renders nothing without parties', () => {
    const wrapper = mount(TurmoilAgendaReference, {
      ...globalConfig,
      props: {parties: [], agendaStyle: 'Chairman', morePartiesExpansion: false},
    });
    expect(wrapper.find('.agenda-reference').exists()).is.false;
  });
});
