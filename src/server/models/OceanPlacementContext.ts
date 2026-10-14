import {Phase} from '@/common/Phase';
import {OceanPlacementContextModel} from '@/common/models/OceanPlacementContextModel';
import {Board} from '@/server/boards/Board';
import {IPlayer} from '@/server/IPlayer';
import {TurmoilHandler} from '@/server/turmoil/TurmoilHandler';

/** Quotes intrinsic ocean-placement facts without executing effects or checking the card's payment. */
export function getOceanPlacementContext(player: IPlayer): OceanPlacementContextModel | undefined {
  const game = player.game;
  if (game.phase !== Phase.ACTION) {
    return undefined;
  }
  const board = game.board;
  const costsKnown = TurmoilHandler.getTilePlacementCostPolicy(player) === undefined;
  return {
    version: 1,
    color: player.color,
    generation: game.generation,
    step: game.lastSaveId,
    oceans: board.getOceanSpaces().length,
    maxOceans: game.parameters.oceans.max,
    spaces: (game.canAddOcean() ? board.getAvailableSpacesForOcean(player) : []).map((space) => ({
      id: space.id,
      bonus: space.bonus.slice(),
      oceanAdjacencyBonus: board.getAdjacentSpaces(space).filter(Board.isOceanSpace).length * player.oceanBonus,
      costsKnown,
      additionalCosts: board.getAdditionalCosts(player, space, undefined, false),
    })),
  };
}
