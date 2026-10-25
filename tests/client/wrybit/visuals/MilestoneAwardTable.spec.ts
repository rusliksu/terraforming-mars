import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import Table from '@/client/wrybit/visuals/milestoneAwardTable/MilestoneAwardTable.vue';
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import {FundedAwardModel} from '@/common/models/FundedAwardModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit milestone and award table', () => {
  it('shows public thresholds, server claimability and team ranks, then refreshes without stale team values', async () => {
    const players = [{color: 'red', name: 'Red'}, {color: 'yellow', name: 'Yellow'}, {color: 'blue', name: 'Blue'}] as Array<PublicPlayerModel>;
    const teamScores = [{playerColors: ['red', 'yellow'] as const, teamColor: 'red' as const, score: 9},
      {playerColors: ['blue'] as const, teamColor: 'blue' as const, score: 7}].map((team) => ({...team, playerColors: [...team.playerColors]}));
    const milestone: ClaimedMilestoneModel = {name: 'Builder12', playerName: undefined, color: undefined, threshold: 12,
      scores: [{color: 'red', score: 2, claimable: true}, {color: 'yellow', score: 1, claimable: false}, {color: 'blue', score: 7, claimable: false}], teamScores};
    const award: FundedAwardModel = {name: 'Banker', playerName: 'Blue', color: 'blue', scores: milestone.scores, teamScores};
    const wrapper = mount(Table, {...globalConfig, props: {players, milestones: [milestone], awards: [award], conglomeratesExpansion: true}});
    try {
      expect(wrapper.get('[data-test="requirement"]').text()).eq('12');
      const red = wrapper.get('[data-test="row-red"]');
      expect(red.findAll('[data-test="team-score"]').map((score) => score.text())).deep.eq(['9', '9']);
      expect(red.find('.ma-table-cell--claimable').exists()).is.true;
      expect(red.findAll('.ma-table-cell--rank-1')).has.length(2);
      expect(wrapper.get('[data-test="row-blue"]').findAll('.ma-table-cell--rank-2')).has.length(2);
      expect(wrapper.get('.ma-table-coin').text()).eq('12');
      expect(wrapper.get('[data-test="award-owner"]').text()).eq('Blue');
      await wrapper.setProps({milestones: [{...milestone, threshold: 8, teamScores: undefined, scores: [{color: 'red', score: 3, claimable: false}]}],
        awards: [{...award, playerName: undefined, color: undefined, teamScores: undefined}], conglomeratesExpansion: false});
      expect(wrapper.get('[data-test="requirement"]').text()).eq('8');
      expect(wrapper.find('[data-test="team-score"]').exists()).is.false;
      expect(wrapper.find('.ma-table-cell--claimable').exists()).is.false;
      expect(wrapper.find('[data-test="award-owner"]').exists()).is.false;
      expect(wrapper.findAll('.ma-table-coin').map((coin) => coin.text())).deep.eq(['8', '8']);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps our custom award label and hides prices after all slots have been taken', () => {
    const awards: Array<FundedAwardModel> = ['Banker', 'Scientist', 'Landlord'].map((name) =>
      ({name: name as FundedAwardModel['name'], playerName: 'Red', color: 'red', scores: []}));
    const customName = 'Synthetic custom award' as FundedAwardModel['name'];
    awards.push({name: customName, playerName: undefined, color: undefined, scores: []});
    const wrapper = mount(Table, {...globalConfig, props: {players: [], milestones: [], awards, conglomeratesExpansion: true}});
    try {
      expect(wrapper.get(`[data-test="award-${customName}"]`).text()).eq(customName);
      expect(wrapper.get(`[data-test="award-${customName}"]`).classes()).contains('ma-table-cell--closed');
      expect(wrapper.find('.ma-table-coin').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
