import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {Tag} from '../../../../common/cards/Tag';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

/**
 * Energy Economics (More Parties, fan) / "Connected Communities": each player gains 3 energy,
 * then loses 2 M€ for every energy (Power) tag they own, max 5, reduced by influence.
 * "Energy tag" is Tag.POWER in this codebase; see Empower.ts's own "energy tag" policy for the
 * same mapping.
 */
export class EnergyEconomics extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.ENERGY_ECONOMICS,
      description: 'Each player receives 3 energy resources. Each player loses 2 M€ for every energy tag they own (max 5, then reduced by influence).',
      revealedDelegate: PartyName.EMPOWER,
      currentDelegate: PartyName.BUREAUCRATS,
      behavior: {
        stock: {
          energy: 3,
        },
        lose: {
          stock: {
            megacredits: {
              tag: Tag.POWER,
              each: 2,
              turmoil: {max: 5, influence: {subtract: true}},
            },
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.energy(3).br;
        b.minus().megacredits(2).slash().tag(Tag.POWER, {size: Size.SMALL}).influence({size: Size.SMALL});
      }),
    });
  }
}
