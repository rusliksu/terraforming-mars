import {expect} from 'chai';
import {groupScoresByTeam} from '@/client/utils/groupScoresByTeam';

type Score = {color: 'red' | 'blue' | 'yellow' | 'green', score: number};

describe('groupScoresByTeam', () => {
  it('falls back to a flat descending sort when teamScores is undefined', () => {
    const scores: Array<Score> = [
      {color: 'red', score: 2},
      {color: 'blue', score: 10},
      {color: 'yellow', score: 6},
    ];
    expect(groupScoresByTeam(scores, undefined).map((s) => s.color)).to.deep.eq(['blue', 'yellow', 'red']);
  });

  it('groups by team, highest team total first, members ordered by their own score within the team', () => {
    const scores: Array<Score> = [
      {color: 'red', score: 2},
      {color: 'blue', score: 10},
      {color: 'yellow', score: 6},
      {color: 'green', score: 1},
    ];
    const teamScores = [
      {playerColors: ['red', 'yellow'] as Array<Score['color']>, teamColor: 'red' as const, score: 8},
      {playerColors: ['blue', 'green'] as Array<Score['color']>, teamColor: 'blue' as const, score: 11},
    ];
    const result = groupScoresByTeam(scores, teamScores).map((s) => s.color);
    expect(result).to.deep.eq(['blue', 'green', 'yellow', 'red']);
  });

  it('appends players not belonging to any team, in descending score order, after every team', () => {
    const scores: Array<Score> = [
      {color: 'red', score: 2},
      {color: 'blue', score: 10},
      {color: 'yellow', score: 6},
    ];
    const teamScores = [
      {playerColors: ['red'] as Array<Score['color']>, teamColor: 'red' as const, score: 2},
    ];
    const result = groupScoresByTeam(scores, teamScores).map((s) => s.color);
    expect(result).to.deep.eq(['red', 'blue', 'yellow']);
  });
});
