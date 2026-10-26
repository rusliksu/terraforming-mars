import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {DELTA_TRACK_TAGS, DeltaProjectExpansion} from '../../delta/DeltaProjectExpansion';
import {digit} from '../Options';

// Positions eligible to be re-triggered: any tagged step at or before your current
// position, excluding the Jovian step (8) and the two VP-only steps (10, 11).
function eligiblePositions(player: IPlayer): ReadonlyArray<number> {
  const current = player.deltaProjectData?.position ?? 0;
  const positions: Array<number> = [];
  for (let pos = 1; pos <= Math.min(current, 9); pos++) {
    if (pos === 8) {
      continue;
    }
    positions.push(pos);
  }
  return positions;
}

export class DutchMountains extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.DUTCH_MOUNTAINS,
      cost: 13,

      metadata: {
        cardNumber: 'DP07',
        renderData: CardRenderer.builder((b) => {
          b.action('Pay 3 energy. Gain the Delta Project bonus of your current step, or any step you have passed, excluding the Jovian step and the VP steps.', (ab) => {
            ab.energy(3, {digit}).startAction.plate('Delta track');
          });
        }),
        description: 'Requires that you have moved 4 steps on the Delta Project track.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return (player.deltaProjectData?.position ?? 0) >= 4;
  }

  public canAct(player: IPlayer): boolean {
    return player.availableEnergy() >= 3 && eligiblePositions(player).length > 0;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const positions = eligiblePositions(player);
    const orOptions = new OrOptions(...positions.map((pos) => {
      const tag = DELTA_TRACK_TAGS[pos];
      const label = tag === undefined ? `step ${pos}` : `the ${tag} bonus (step ${pos})`;
      return new SelectOption(`Re-trigger ${label}`, 'Select').andThen(() => {
        return player.spendEnergy(3, () => {
          DeltaProjectExpansion.grantRewardForPosition(player, pos, 'primary');
          return undefined;
        });
      });
    }));
    if (orOptions.options.length === 1) {
      return orOptions.options[0].cb();
    }
    return orOptions;
  }
}
