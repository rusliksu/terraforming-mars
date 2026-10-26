import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {DeltaProjectExpansion} from '../../delta/DeltaProjectExpansion';
import {digit} from '../Options';

function ownTilesAdjacentToOcean(player: IPlayer): number {
  const board = player.game.board;
  const found = new Set<string>();
  for (const ocean of board.getOceanSpaces()) {
    for (const adjacent of board.getAdjacentSpaces(ocean)) {
      if (adjacent.tile !== undefined && adjacent.player === player) {
        found.add(adjacent.id);
      }
    }
  }
  return found.size;
}

export class StormSurgeBarrier extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.STORM_SURGE_BARRIER,
      cost: 12,

      metadata: {
        cardNumber: 'DP11',
        renderData: CardRenderer.builder((b) => {
          b.action('Gain 1 energy for each of your tiles adjacent to an ocean tile. OR: Spend 1 energy to advance 1 step on the Delta Project track.', (ab) => {
            ab.empty().startAction.energy(1, {digit});
          });
        }),
        description: 'Requires that you have a city tile adjacent to an ocean tile.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return ownTilesAdjacentToOcean(player) > 0;
  }

  public canAct(player: IPlayer): boolean {
    return ownTilesAdjacentToOcean(player) > 0 ||
      (player.availableEnergy() >= 1 && DeltaProjectExpansion.canForceAdvanceOneStep(player, 'primary'));
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const adjacentCount = ownTilesAdjacentToOcean(player);
    const canAdvance = player.availableEnergy() >= 1 && DeltaProjectExpansion.canForceAdvanceOneStep(player, 'primary');

    const options: Array<SelectOption> = [];
    if (adjacentCount > 0) {
      options.push(new SelectOption(`Gain ${adjacentCount} energy`, 'Gain energy').andThen(() => {
        player.stock.add(Resource.ENERGY, adjacentCount, {log: true, from: {card: this}});
        return undefined;
      }));
    }
    if (canAdvance) {
      options.push(new SelectOption('Spend 1 energy to advance 1 step on the Delta Project track', 'Advance').andThen(() => {
        return player.spendEnergy(1, () => {
          DeltaProjectExpansion.forceAdvanceOneStep(player, 'primary');
          return undefined;
        });
      }));
    }
    if (options.length === 1) {
      return options[0].cb(undefined);
    }
    return new OrOptions(...options);
  }
}
