import {mount} from '@vue/test-utils';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {expect} from 'chai';
import Award from '@/client/components/Award.vue';
import {FundedAwardModel} from '@/common/models/FundedAwardModel';
import {getAward} from '@/client/MilestoneAwardManifest';

function createAward(
  {funded, scores = [], color = 'red'}:
  {funded: boolean, scores?: FundedAwardModel['scores'], color?: FundedAwardModel['color']},
): FundedAwardModel {
  return {
    name: `Cosmic Settler`,
    playerName: funded ? 'Bob' : undefined,
    color: funded ? color: undefined,
    scores,
  };
}

describe('Award', () => {
  it('shows passed award', () => {
    const award = createAward({funded: false});
    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award},
    });

    expect(wrapper.text()).to.include(award.name);
  });

  it('does not show award description', () => {
    const award = createAward({funded: false});
    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award},
    });

    const expected = getAward('Cosmic Settler').description;
    expect(wrapper.text()).to.not.include(expected);
  });

  const showScoresRuns = [
    {value: undefined, expected: true},
    {value: true, expected: true},
    {value: false, expected: false},
  ] as const;
  for (const run of showScoresRuns) {
    it('Show scores ' + run.value, () => {
      const award = createAward({funded: true, scores: [{color: 'red', score: 2}]});
      const wrapper = mount(Award, {...globalConfig, props: {award, showScores: run.value}});

      expect(wrapper.find('[data-test=player-score]').exists()).to.eq(run.expected);
    });
  }

  it('colors player score', () => {
    const award = createAward({
      funded: true,
      scores: [
        {color: 'red', score: 2},
      ],
    });

    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award, showScores: true},
    });

    const scoreWrapper = wrapper.find('[data-test=player-score]');
    expect(scoreWrapper.classes()).to.includes(`player_bg_color_${award.scores[0].color}`);
  });

  it('shows sorted players scores', () => {
    const award = createAward({
      funded: false,
      scores: [
        {color: 'red', score: 2},
        {color: 'blue', score: 4},
        {color: 'yellow', score: 0},
        {color: 'green', score: 4},
      ],
    });

    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award, showScores: true},
    });

    const scores = wrapper.findAll('[data-test=player-score]')
      .map((scoreWrapper) => parseInt(scoreWrapper.text()));

    expect(scores).to.be.deep.eq([4, 4, 2, 0]);
  });

  it('shows player cube if award is funded', () => {
    const award = createAward({funded: true});
    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award},
    });

    expect(wrapper.find(`.board-cube--${award.color}`).exists()).to.be.true;
  });

  it('adds persona cube styling for reserved player colors', () => {
    const award = createAward({funded: true, color: 'hydro'});
    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award},
    });

    expect(wrapper.find('.board-cube--hydro').classes()).to.include('board-cube--persona');
  });

  it('creates correct css class from award name', () => {
    const award = createAward({funded: true});
    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award},
    });

    expect(wrapper.find('.ma-name--cosmic-settler').exists()).to.be.true;
  });

  it('appends a team note to the description when Conglomerates is on', () => {
    const award = createAward({funded: false});
    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award, showDescription: true, conglomeratesExpansion: true},
    });

    const base = getAward('Cosmic Settler').description;
    expect(wrapper.text()).to.include(`${base} between you and your teammate`);
  });

  it('does not append a team note when Conglomerates is off', () => {
    const award = createAward({funded: false});
    const wrapper = mount(Award, {
      ...globalConfig,
      props: {award, showDescription: true},
    });

    expect(wrapper.text()).to.not.include('between you and your teammate');
  });

  it('shows a team score row when teamScores is set', () => {
    const award = createAward({funded: false});
    award.teamScores = [
      {playerColors: ['red', 'yellow'], teamColor: 'red', score: 9},
      {playerColors: ['blue', 'green'], teamColor: 'blue', score: 4},
    ];
    const wrapper = mount(Award, {...globalConfig, props: {award}});

    const rows = wrapper.findAll('[data-test=team-score]').map((w) => w.text());
    expect(rows).to.deep.eq(['9', '4']);
  });

  it('groups player scores by team, highest team first, instead of a flat individual ranking', () => {
    const award = createAward({
      funded: false,
      scores: [
        {color: 'red', score: 2},
        {color: 'blue', score: 10},
        {color: 'yellow', score: 6},
        {color: 'green', score: 1},
      ],
    });
    award.teamScores = [
      // red+yellow team totals 8; blue+green team totals 11 -- blue+green should lead despite
      // red individually outranking green.
      {playerColors: ['red', 'yellow'], teamColor: 'red', score: 8},
      {playerColors: ['blue', 'green'], teamColor: 'blue', score: 11},
    ];
    const wrapper = mount(Award, {...globalConfig, props: {award, showScores: true}});

    const colors = wrapper.findAll('[data-test=player-score]')
      .filter((w) => /^\d+$/.test(w.text()))
      .map((w) => w.classes().find((c) => c.startsWith('player_bg_color_'))?.replace('player_bg_color_', ''));
    // blue+green (higher team total) first, yellow ranked above red within their own team.
    expect(colors).to.deep.eq(['blue', 'green', 'yellow', 'red']);
  });

  it('colors each team score with that team\'s own color and shows it above the player scores', () => {
    const award = createAward({funded: true, scores: [{color: 'red', score: 2}]});
    award.teamScores = [
      {playerColors: ['red', 'yellow'], teamColor: 'red', score: 9},
    ];
    const wrapper = mount(Award, {...globalConfig, props: {award, showScores: true}});

    expect(wrapper.find('[data-test=team-score]').classes()).to.include('ma-team-score--red');

    const nameBlock = wrapper.find('.ma-name--awards');
    const teamScoresEl = nameBlock.find('.ma-team-scores').element;
    const playerScoresEl = nameBlock.find('.ma-scores').element;
    // DOCUMENT_POSITION_FOLLOWING (4) means teamScoresEl comes before playerScoresEl.
    expect(teamScoresEl.compareDocumentPosition(playerScoresEl) & Node.DOCUMENT_POSITION_FOLLOWING).to.eq(4);
  });

  it('does not show a team score row when teamScores is absent', () => {
    const award = createAward({funded: false});
    const wrapper = mount(Award, {...globalConfig, props: {award}});

    expect(wrapper.find('[data-test=team-score]').exists()).to.be.false;
  });
});
