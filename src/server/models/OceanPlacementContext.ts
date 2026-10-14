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
  const context: OceanPlacementContextModel = {
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
  const hazards = game.aresData?.hazardData;
  // Pending Ares transitions can change the second cell's costs and availability.
  if (context.maxOceans - context.oceans >= 2 && context.spaces.length <= 64 && costsKnown &&
      !hazards?.erosionOceanCount.available && !hazards?.removeDustStormsOceanCount.available) {
    context.pairs = context.spaces.flatMap((first) => context.spaces
      .filter((second) => second.id !== first.id)
      .map((second) => ({
        firstSpaceId: first.id,
        secondSpaceId: second.id,
        secondOceanAdjacencyBonus: second.oceanAdjacencyBonus +
          (board.getAdjacentSpaces(board.getSpaceOrThrow(second.id)).some((adjacent) => adjacent.id === first.id) ? player.oceanBonus : 0),
      })));
  }
  return context;
}
