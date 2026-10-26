import {IGame} from '../IGame';
import {ConglomeratesExpansion} from '../conglomerates/ConglomeratesExpansion';
import {ConglomeratesModel} from '../../common/models/ConglomeratesModel';

export function getConglomeratesModel(game: IGame): ConglomeratesModel | undefined {
  if (!game.gameOptions.conglomeratesExpansion) {
    return undefined;
  }
  return {teams: ConglomeratesExpansion.getTeamModels(game)};
}
