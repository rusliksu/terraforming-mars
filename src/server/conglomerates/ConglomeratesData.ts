import {PlayerId} from '../../common/Types';

export type ConglomeratesTeam = {
  playerIds: Array<PlayerId>;
  /** VP not attributed to an individual player, e.g. from winning a Turmoil ruling. */
  bonusVictoryPoints: number;
}

export type ConglomeratesData = {
  teams: Array<ConglomeratesTeam>;
}
