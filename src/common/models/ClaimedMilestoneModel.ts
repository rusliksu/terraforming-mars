import {Color} from '../Color';
import {MilestoneName} from '../ma/MilestoneName';
import {ConglomeratesTeamScore} from './ConglomeratesModel';

export type MilestoneScore = {
  color: Color;
  score: number;
  claimable: boolean;
}

export type ClaimedMilestoneModel = {
  name: MilestoneName;
  playerName: string | undefined;
  color: Color | undefined;
  scores: Array<MilestoneScore>;
  /** Only present in Conglomerates games -- each team's combined score for this milestone. */
  teamScores?: Array<ConglomeratesTeamScore>;
}
