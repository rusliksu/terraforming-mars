import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import ConglomeratesTeams from '@/client/components/conglomerates/ConglomeratesTeams.vue';
import {ConglomeratesModel} from '@/common/models/ConglomeratesModel';

function fakeModel(): ConglomeratesModel {
  return {
    teams: [
      {
        id: 'team-1',
        playerIds: ['p-blue-id', 'p-yellow-id'] as any,
        playerColors: ['blue', 'yellow'],
        teamColor: 'red',
        memberScores: [22, 16],
        name: 'Blue & Yellow',
        victoryPoints: {players: 30, milestones: 8, awards: 0, bonuses: 0, total: 38},
      },
      {
        id: 'team-2',
        playerIds: ['p-red-id', 'p-green-id'] as any,
        playerColors: ['red', 'green'],
        teamColor: 'blue',
        memberScores: [12, 16],
        name: 'Red & Green',
        victoryPoints: {players: 20, milestones: 0, awards: 8, bonuses: 0, total: 28},
      },
    ],
  };
}

describe('ConglomeratesTeams', () => {
  it('renders nothing when there are no teams', () => {
    const wrapper = shallowMount(ConglomeratesTeams, {
      ...globalConfig,
      props: {model: {teams: []}},
    });
    expect(wrapper.find('.conglomerates-teams').exists()).to.be.false;
  });

  it('renders one card per team with its live VP breakdown', () => {
    const wrapper = shallowMount(ConglomeratesTeams, {
      ...globalConfig,
      props: {model: fakeModel()},
    });
    const teamCards = wrapper.findAll('.conglomerates-team');
    expect(teamCards).to.have.lengthOf(2);
    expect(teamCards[0].find('.conglomerates-team-name').text()).to.eq('Blue & Yellow');
    expect(teamCards[0].find('.conglomerates-team-total-score').text()).to.eq('38');
    expect(teamCards[0].find('.conglomerates-team-header').findAll('.conglomerates-team-swatch')).to.have.lengthOf(2);
  });

  it('renders each member\'s own score in the member-scores row', () => {
    const wrapper = shallowMount(ConglomeratesTeams, {
      ...globalConfig,
      props: {model: fakeModel()},
    });
    const teamCards = wrapper.findAll('.conglomerates-team');
    const scores = teamCards[0].findAll('.conglomerates-team-member-score').map((s) => s.text());
    expect(scores).to.deep.eq(['(22)', '(16)']);
  });

  it('colors the team total with the team\'s shared Turmoil delegate color', () => {
    const wrapper = shallowMount(ConglomeratesTeams, {
      ...globalConfig,
      props: {model: fakeModel()},
    });
    const teamCards = wrapper.findAll('.conglomerates-team');
    expect(teamCards[0].find('.conglomerates-team-total').classes()).to.include('conglomerates-team-total--red');
    expect(teamCards[1].find('.conglomerates-team-total').classes()).to.include('conglomerates-team-total--blue');
  });

  it('toggles the breakdown visibility when the title is clicked', async () => {
    const wrapper = shallowMount(ConglomeratesTeams, {
      ...globalConfig,
      props: {model: fakeModel()},
    });
    expect(wrapper.vm.expanded).to.be.true;
    await wrapper.find('.ma-clickable').trigger('click');
    expect(wrapper.vm.expanded).to.be.false;
  });
});
