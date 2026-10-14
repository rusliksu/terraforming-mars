import {CardName} from '@/common/cards/CardName';
import {CardModel} from '@/common/models/CardModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';

/** Uses the public tableau, including cards stored on Self-Replicating Robots. */
export function logCardModel(name: CardName, players: ReadonlyArray<PublicPlayerModel>): CardModel {
  let resources: number | undefined;
  for (const player of players) {
    const card = player.tableau.find((card) => card.name === name) ??
      player.selfReplicatingRobotsCards.find((card) => card.name === name);
    if (card !== undefined) {
      resources = card.resources;
      break;
    }
  }
  return {
    name,
    resources,
    isSelfReplicatingRobotsCard: players.some((player) => player.selfReplicatingRobotsCards.some((card) => card.name === name)),
  } as CardModel;
}
