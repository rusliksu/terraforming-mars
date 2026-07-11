import {CardName} from '../../common/cards/CardName';
import {ColonyName} from '../../common/colonies/ColonyName';
import {Units} from '../../common/Units';
import {isIProjectCard} from '../cards/IProjectCard';
import {IGame} from '../IGame';
import {toName} from '../../common/utils/utils';

export type EarlyGameGeneration = 1 | 2;

export interface EarlyGameGenerationStats {
  /** False when the server started collecting after generation 1 had already ended. */
  complete: boolean;
  projectCards: Array<CardName>;
  colonies: Array<ColonyName>;
  /** Production tracks after all actions, immediately before this generation's production phase. */
  production: Units;
}

export interface EarlyGameStats {
  version: 1;
  1?: EarlyGameGenerationStats;
  2?: EarlyGameGenerationStats;
}

function multisetDifference<T>(current: ReadonlyArray<T>, prior: ReadonlyArray<T>): Array<T> {
  const remaining = [...prior];
  return current.filter((item) => {
    const index = remaining.indexOf(item);
    if (index === -1) {
      return true;
    }
    remaining.splice(index, 1);
    return false;
  });
}

export function captureEarlyGameStats(game: IGame): void {
  if (game.generation !== 1 && game.generation !== 2) {
    return;
  }

  const generation: EarlyGameGeneration = game.generation;
  for (const player of game.players) {
    const prior = generation === 2 ? player.earlyGameStats[1] : undefined;
    const complete = generation === 1 || prior !== undefined;
    const currentProjectCards = player.playedCards.filter(isIProjectCard).map(toName);
    const currentColonies = game.colonies.flatMap((colony) =>
      colony.colonies.filter((playerId) => playerId === player.id).map(() => colony.name));

    player.earlyGameStats[generation] = {
      complete,
      projectCards: complete ? multisetDifference(currentProjectCards, prior?.projectCards ?? []) : [],
      colonies: complete ? multisetDifference(currentColonies, prior?.colonies ?? []) : [],
      production: {
        megacredits: player.production.megacredits,
        steel: player.production.steel,
        titanium: player.production.titanium,
        plants: player.production.plants,
        energy: player.production.energy,
        heat: player.production.heat,
      },
    };
  }
}
