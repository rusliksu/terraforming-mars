import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import Milestone from '@/client/wrybit/visuals/Milestone.vue';
import Milestones from '@/client/wrybit/visuals/Milestones.vue';
import Awards from '@/client/wrybit/visuals/Awards.vue';
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import {FundedAwardModel} from '@/common/models/FundedAwardModel';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit milestone and award presentation with our models', () => {
  it('retains the Conglomerates threshold patch, team order and server claimability after refresh', async () => {
    const milestone: ClaimedMilestoneModel = {
      name: 'Builder12', playerName: 'Synthetic player', color: 'turquoise',
      scores: [{color: 'red', score: 2, claimable: true}, {color: 'yellow', score: 1, claimable: false}, {color: 'blue', score: 7, claimable: false}],
      teamScores: [{playerColors: ['red', 'yellow'], teamColor: 'red', score: 9}, {playerColors: ['blue'], teamColor: 'blue', score: 7}],
    };
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone, showDescription: true}});
    try {
      expect(wrapper.get('.ma-number-patch').text()).eq('12');
      expect(wrapper.findAll('[data-test="team-score"]').map((score) => score.text())).deep.eq(['9', '7']);
      expect(wrapper.findAll('[data-test="player-score"]').map((score) => score.text())).deep.eq(['2', '1', '7']);
      expect(wrapper.find('.claimable').text()).eq('2');
      expect(wrapper.find('.wrybit-player-persona').exists()).is.true;
      await wrapper.setProps({milestone: {...milestone, name: 'Builder', color: undefined, playerName: undefined, teamScores: undefined,
        scores: [{color: 'blue', score: 3, claimable: false}]}});
      expect(wrapper.find('.ma-number-patch').exists()).is.false;
      expect(wrapper.find('[data-test="team-score"]').exists()).is.false;
      expect(wrapper.find('.claimable').exists()).is.false;
      expect(wrapper.find('.ma-player').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('shows our Conglomerates costs and Coordination hints while retaining list controls', async () => {
    const milestone: ClaimedMilestoneModel = {name: 'Builder', playerName: 'Synthetic player', color: 'blue', scores: []};
    const award: FundedAwardModel = {name: 'Banker', playerName: 'Synthetic player', color: 'blue', scores: [],
      teamScores: [{playerColors: ['blue', 'green'], teamColor: 'blue', score: 5}]};
    const preferences = {...PreferencesManager.INSTANCE.values(), learner_mode: true};
    const milestones = mount(Milestones, {...globalConfig, props: {milestones: [milestone], conglomeratesExpansion: true, preferences}});
    const awards = mount(Awards, {...globalConfig, attachTo: document.body, props: {awards: [award], conglomeratesExpansion: true, preferences}});
    try {
      expect(milestones.findAll('.milestone-award-price').map((price) => price.text())).deep.eq(['12', '12']);
      expect(awards.findAll('[data-test="spot-price"]').map((price) => price.text())).deep.eq(['18', '24']);
      expect(awards.findAll('[data-test="award-coordination-icon"]')).has.length(2);
      expect(awards.get('[data-test="team-score"]').text()).eq('5');
      expect(awards.find('.ma-description').text()).contains('between you and your teammate');
      await awards.get('[data-test="toggle-awards"]').trigger('click');
      expect(awards.find('.ma-block').isVisible()).is.false;
      await milestones.setProps({preferences: {...preferences, learner_mode: false}});
      expect(milestones.find('.milestone-award-inline.unpaid').exists()).is.false;
    } finally {
      milestones.unmount();
      awards.unmount();
    }
  });
});
