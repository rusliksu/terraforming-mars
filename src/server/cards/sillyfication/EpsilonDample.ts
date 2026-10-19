import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {DeltaProjectExpansion} from '../../delta/DeltaProjectExpansion';
import {DeltaProjectInput} from '../../delta/DeltaProjectInput';
import {digit} from '../Options';
import {Size} from '../../../common/cards/render/Size';

/** Grants a second, independently-controlled marker on the Delta Project track, which can
 * also move backward. Every landing (either direction) grants that position's reward again -
 * shuttling the marker back and forth to re-farm a reward as long as you keep paying the
 * energy for it is the whole point of this corp. It can still gain its own Jovian tag from
 * position 8, independently of the primary marker. Once it reaches the 2VP or 5VP spot it
 * locks in place - no more advancing or retreating - matching the fact that no marker (not
 * even the player's own other one) can ever land on a VP spot another marker already holds. */
export class EpsilonDample extends CorporationCard implements ICorporationCard, IActionCard {
  constructor() {
    super({
      name: CardName.EPSILON_DAMPLE,
      tags: [Tag.POWER, Tag.BUILDING],
      startingMegaCredits: 29,

      behavior: {
        stock: {steel: 9, energy: 3},
      },

      metadata: {
        cardNumber: 'DP02',
        description: 'You start with 29 M€, 9 steel, and 3 energy.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(29).nbsp.steel(9, {digit}).nbsp.energy(3, {digit}).br;
          b.corpBox('effect-action', (cea) => {
            cea.vSpace(Size.LARGE);
            cea.br;
            cea.effect('You have 1 special Delta Project marker.', (eb) => {
              eb.empty().startEffect.plate('Delta track', {size: Size.SMALL});
            });
            cea.br;
            cea.action('Move the special marker forward or backward on the Delta Project track. It locks in place once it reaches a VP spot.', (ab) => {
              ab.text('X', {size: Size.SMALL}).energy(1, {size: Size.SMALL}).startAction.text('±X', {size: Size.SMALL}).plate('Delta track', {size: Size.SMALL});
            });
          });
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.epsilonDampleData = {position: 0, jovianBonus: false};
    return undefined;
  }

  public canAct(player: IPlayer): boolean {
    return DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player).length > 0 ||
      DeltaProjectExpansion.getValidEpsilonRetreatSteps(player).length > 0;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const canAdvance = DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player).length > 0;
    const canRetreat = DeltaProjectExpansion.getValidEpsilonRetreatSteps(player).length > 0;

    const orOptions = new OrOptions();

    if (canAdvance) {
      orOptions.options.push(new SelectOption('Advance', 'Advance').andThen(() => {
        return new DeltaProjectInput(DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player))
          .andThen((amount) => {
            DeltaProjectExpansion.advanceEpsilon(player, amount);
            return undefined;
          });
      }));
    }

    if (canRetreat) {
      orOptions.options.push(new SelectOption('Move backward', 'Move backward').andThen(() => {
        return new DeltaProjectInput(DeltaProjectExpansion.getValidEpsilonRetreatSteps(player), {reverse: true})
          .andThen((amount) => {
            DeltaProjectExpansion.retreatEpsilon(player, amount);
            return undefined;
          });
      }));
    }

    if (orOptions.options.length === 1) {
      return orOptions.options[0].cb();
    }
    return orOptions;
  }
}
