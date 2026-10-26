import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PartyName} from '../../../common/turmoil/PartyName';

/**
 * Condensation Plant (Solaris, fan): doubles this player's standard end-of-generation
 * Energy->Heat conversion (1 extra Heat per Energy converted). Hooked directly into
 * `Player.runProductionPhase` (see the `CONDENSATION_PLANT` check there) since that
 * conversion happens inline in Player.ts rather than through a per-card dispatch hook --
 * there was no existing "energy converted to heat" hook point to declare this
 * declaratively, so this is a new, minimal special case there, following the precedent of
 * the existing Supercapacitors/RobAntillesEnergyKeep special cases in the same method.
 */
export class CondensationPlant extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.CONDENSATION_PLANT,
      tags: [Tag.POWER, Tag.BUILDING],
      cost: 14,

      requirements: {party: PartyName.KELVINISTS},

      metadata: {
        cardNumber: 'SOL17',
        renderData: CardRenderer.builder((b) => {
          b.effect('When your Energy is converted to Heat during production, gain 1 extra Heat per Energy converted.', (eb) => {
            eb.energy(1).startEffect.heat(2);
          });
        }),
        description: 'Requires that Kelvinists are ruling or that you have 2 delegates there.',
      },
    });
  }
}
