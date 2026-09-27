import {Color} from '../Color';
import {AwardName} from '../ma/AwardName';
import {ConglomeratesTeamScore} from './ConglomeratesModel';

export type AwardScore = {
  color: Color;
  score: number;
}

export type FundedAwardModel = {
  name: AwardName;
  playerName: string | undefined;
  color: Color | undefined;
  scores: Array<AwardScore>;
  /** Only present in Conglomerates games -- each team's combined score for this award. */
  teamScores?: Array<ConglomeratesTeamScore>;
}
