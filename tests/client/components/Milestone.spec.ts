import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import Milestone from '@/client/components/Milestone.vue';
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import {getMilestone} from '@/client/MilestoneAwardManifest';

function createMilestone(
  {claimed, scores = [], color = 'red'}:
  {claimed: boolean, scores?: ClaimedMilestoneModel['scores'], color?: ClaimedMilestoneModel['color']},
): ClaimedMilestoneModel {
  return {
    name: 'Builder',
    playerName: claimed ? 'Bob' : undefined,
    color: claimed ? color: undefined,
    scores,
  };
}

describe('Milestone', () => {
  it('shows passed milestone', () => {
    const milestone = createMilestone({claimed: false});
    const wrapper = mount(Milestone, {
      ...globalConfig,
      props: {milestone},
    });

    expect(wrapper.text()).to.include(milestone.name);
  });

  it('does not show milestone description', () => {
    const milestone = createMilestone({claimed: false});
    const wrapper = mount(Milestone, {
      ...globalConfig,
      props: {milestone},
    });

    const expected = getMilestone('Builder').description;
    expect(wrapper.text()).to.not.include(expected);
  });

  const showScoresRuns = [
    {value: undefined, expected: true},
    {value: true, expected: true},
    {value: false, expected: false},
  ] as const;
  for (const run of showScoresRuns) {
    it('Show scores ' + run.value, () => {
      const milestone = createMilestone({claimed: true, scores: [{color: 'red', score: 2, claimable: false}]});
      const wrapper = mount(Milestone, {...globalConfig, props: {milestone, showScores: run.value}});

      expect(wrapper.find('[data-test=player-score]').exists()).to.eq(run.expected);
    });
  }

  it('colors player score', () => {
    const milestone = createMilestone({
      claimed: true,
      scores: [
        {color: 'red', score: 2, claimable: false},
      ],
    });

    const wrapper = mount(Milestone, {...globalConfig, props: {milestone, showScores: true}});

    const scoreWrapper = wrapper.find('[data-test=player-score]');
    expect(scoreWrapper.classes()).to.includes(`player_bg_color_${milestone.scores[0].color}`);
  });

  it('shows sorted players scores', () => {
    const milestone = createMilestone({
      claimed: false,
      scores: [
        {color: 'red', score: 2, claimable: false},
        {color: 'blue', score: 4, claimable: false},
        {color: 'yellow', score: 0, claimable: false},
        {color: 'green', score: 4, claimable: false},
      ],
    });

    const wrapper = mount(Milestone, {...globalConfig, props: {milestone, showScoresRuns: true}});

    const scores = wrapper.findAll('[data-test=player-score]')
      .map((scoreWrapper) => parseInt(scoreWrapper.text()));

    expect(scores).to.be.deep.eq([4, 4, 2, 0]);
  });

  it('shows player cube if milestone is claimed', () => {
    const milestone = createMilestone({claimed: true});
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    expect(wrapper.find(`.board-cube--${milestone.color}`).exists()).to.be.true;
  });

  it('adds persona cube styling for reserved player colors', () => {
    const milestone = createMilestone({claimed: true, color: 'turquoise'});
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    expect(wrapper.find('.board-cube--turquoise').classes()).to.include('board-cube--persona');
  });

  it('creates correct css class from milestone name', () => {
    const milestone = createMilestone({claimed: true});
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    expect(wrapper.find('.ma-name--builder').exists()).to.be.true;
  });

  it('patches the corner number for a Conglomerates milestone variant', () => {
    const milestone = createMilestone({claimed: false});
    milestone.name = 'Builder12';
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    expect(wrapper.find('.ma-number-patch').text()).to.eq('12');
    expect(wrapper.find('.ma-name--builder12').exists()).to.be.true;
  });

  it('patches the corner number for an expansion Conglomerates milestone variant too', () => {
    const milestone = createMilestone({claimed: false});
    milestone.name = 'Hoverlord11';
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    expect(wrapper.find('.ma-number-patch').text()).to.eq('11');
    expect(wrapper.find('.ma-name--hoverlord11').exists()).to.be.true;
  });

  it('does not show a number patch for a normal (non-Conglomerates) milestone', () => {
    const milestone = createMilestone({claimed: false});
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    expect(wrapper.find('.ma-number-patch').exists()).to.be.false;
  });

  it('shows a team score row when teamScores is set', () => {
    const milestone = createMilestone({claimed: false});
    milestone.teamScores = [
      {playerColors: ['red', 'yellow'], teamColor: 'red', score: 9},
      {playerColors: ['blue', 'green'], teamColor: 'blue', score: 4},
    ];
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    const rows = wrapper.findAll('[data-test=team-score]').map((w) => w.text());
    expect(rows).to.deep.eq(['9', '4']);
  });

  it('groups player scores by team, highest team first, instead of a flat individual ranking', () => {
    const milestone = createMilestone({
      claimed: false,
      scores: [
        {color: 'red', score: 2, claimable: false},
        {color: 'blue', score: 10, claimable: false},
        {color: 'yellow', score: 6, claimable: false},
        {color: 'green', score: 1, claimable: false},
      ],
    });
    milestone.teamScores = [
      // red+yellow team totals 8; blue+green team totals 11 -- blue+green should lead despite
      // red individually outranking green.
      {playerColors: ['red', 'yellow'], teamColor: 'red', score: 8},
      {playerColors: ['blue', 'green'], teamColor: 'blue', score: 11},
    ];
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone, showScores: true}});

    const colors = wrapper.findAll('[data-test=player-score]')
      .filter((w) => /^\d+$/.test(w.text()))
      .map((w) => w.classes().find((c) => c.startsWith('player_bg_color_'))?.replace('player_bg_color_', ''));
    // blue+green (higher team total) first, yellow ranked above red within their own team.
    expect(colors).to.deep.eq(['blue', 'green', 'yellow', 'red']);
  });

  it('does not show a team score row when teamScores is absent', () => {
    const milestone = createMilestone({claimed: false});
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone}});

    expect(wrapper.find('[data-test=team-score]').exists()).to.be.false;
  });

  it('colors each team score with that team\'s own color and shows it above the player scores', () => {
    const milestone = createMilestone({claimed: true, scores: [{color: 'red', score: 2, claimable: false}]});
    milestone.teamScores = [
      {playerColors: ['red', 'yellow'], teamColor: 'red', score: 9},
    ];
    const wrapper = mount(Milestone, {...globalConfig, props: {milestone, showScores: true}});

    expect(wrapper.find('[data-test=team-score]').classes()).to.include('ma-team-score--red');

    const nameBlock = wrapper.find('.ma-name--milestones');
    const teamScoresEl = nameBlock.find('.ma-team-scores').element;
    const playerScoresEl = nameBlock.find('.ma-scores').element;
    // DOCUMENT_POSITION_FOLLOWING (4) means teamScoresEl comes before playerScoresEl.
    expect(teamScoresEl.compareDocumentPosition(playerScoresEl) & Node.DOCUMENT_POSITION_FOLLOWING).to.eq(4);
  });
});
