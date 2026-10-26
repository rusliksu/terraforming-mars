import {Color} from '@/common/Color';
import {ConglomeratesTeamScore} from '@/common/models/ConglomeratesModel';
import {comparing, reversed} from '@/common/utils/Ordering';

/**
 * Orders a milestone/award's per-player scores for display. In Conglomerates games (when
 * `teamScores` is given), groups players by team -- highest-scoring team's members first, so
 * they line up under that team's own (double-width) badge in the row above -- instead of a
 * flat individual ranking. Outside Conglomerates, falls back to the old plain descending sort.
 */
export function groupScoresByTeam<T extends {color: Color, score: number}>(
  scores: ReadonlyArray<T>,
  teamScores: ReadonlyArray<ConglomeratesTeamScore> | undefined,
): Array<T> {
  const byScoreDescending = reversed(comparing((score: T) => score.score));
  if (teamScores === undefined) {
    return scores.toSorted(byScoreDescending);
  }

  const orderedTeams = teamScores.toSorted(reversed(comparing((team) => team.score)));
  const seen = new Set<Color>();
  const grouped: Array<T> = [];
  for (const team of orderedTeams) {
    const members = team.playerColors
      .map((color) => scores.find((score) => score.color === color))
      .filter((score): score is T => score !== undefined)
      .toSorted(byScoreDescending);
    for (const member of members) {
      grouped.push(member);
      seen.add(member.color);
    }
  }

  // Any player not part of a team (shouldn't normally happen in a Conglomerates game) keeps
  // the old individual ranking, appended after every team's members.
  const leftover = scores.filter((score) => !seen.has(score.color)).toSorted(byScoreDescending);
  return [...grouped, ...leftover];
}
