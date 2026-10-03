import {PlayerId} from '../Types';
import {Color} from '../Color';
import {TeamVictoryPointsBreakdown} from '../conglomerates/TeamVictoryPointsBreakdown';

export type ConglomeratesTeamModel = {
  id: string;
  playerIds: Array<PlayerId>;
  playerColors: Array<Color>;
  /** The team's shared Turmoil delegate color (see ConglomeratesExpansion.teamDisplayColor). */
  teamColor: Color | undefined;
  /** Each member's own personal VP total, same order as playerIds/playerColors. */
  memberScores: Array<number>;
  name: string;
  victoryPoints: TeamVictoryPointsBreakdown;
}

export type ConglomeratesModel = {
  teams: Array<ConglomeratesTeamModel>;
}

/** A team's combined score for one milestone/award, shown alongside the per-player scores. */
export type ConglomeratesTeamScore = {
  playerColors: Array<Color>;
  /** The team's shared Turmoil delegate color (see ConglomeratesExpansion.teamDisplayColor). */
  teamColor: Color | undefined;
  score: number;
}
