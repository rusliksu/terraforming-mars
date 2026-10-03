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
    expect(wrapper.findAll('button').map((button) => button.text())).to.deep.eq(['Spome']);
    expect(wrapper.findAll('[data-agenda-id]').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob01', 'spob02', 'spop01', 'spop02', 'spop03', 'spop04']);
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob02', 'spop03']);

    await wrapper.setProps({parties: [{name: PartyName.SPOME, agenda: {bonusId: 'spob01', policyId: 'spop02'}}]});
    expect(wrapper.findAll('.agenda-reference-current').map((option) => option.attributes('data-agenda-id')))
      .to.deep.eq(['spob01', 'spop02']);
  });

  it('shows only the current policy of each party without Chairman', async () => {
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
      .to.deep.eq(['spop02']);
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
