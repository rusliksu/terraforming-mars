import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Bonus} from '../Bonus';
import {Policy, IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {ChooseTagPolicy} from './ChooseTagPolicy';

/**
 * More Parties: Empower, one of the 6 new "Political Agendas" parties. The source material
 * references a "nuclear" tag and a "radiation" tag alongside the energy (Power) tag, and an
 * "industry" tag -- none of those exist in this codebase, so bonus A/B and policy 4 are adapted
 * to use only the Power tag, per the source document's own guidance to ignore such references.
 * Policy 1's "energy resources can be used as 2 M€" half is implemented, mirroring Helion's
 * canUseHeatAsMegaCredits (Player.canUseEnergyAsMegaCredits, threaded through the payment
 * system the same way). Its "2 M€ can be used as Energy resources" reverse direction is not
 * implemented -- this codebase's payment system only ever converts alternate currencies *into*
 * M€ for a M€-denominated cost, never the other way around (spending M€ to satisfy a resource
 * cost), and Helion itself is one-directional for the same reason ("You may not use M€ as heat").
 */
export class Empower extends Party implements IParty {
  readonly name = PartyName.EMPOWER;
  readonly bonuses = [EMPOWER_BONUS_1, EMPOWER_BONUS_2];
  readonly policies = [EMPOWER_POLICY_1, EMPOWER_POLICY_2, EMPOWER_POLICY_3, EMPOWER_POLICY_4];
}

class EmpowerBonus01 extends Bonus {
  readonly id = 'empb01' as const;
  readonly description = 'Gain 1 M€ for every energy tag and every card with no tag you have';

  getScore(player: IPlayer) {
    const noTagCards = player.tableau.asArray().filter((card) => card.tags.length === 0).length;
    return player.tags.count(Tag.POWER, 'raw') + noTagCards;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.EMPOWER}});
  }
}

class EmpowerBonus02 extends Bonus {
  readonly id = 'empb02' as const;
  readonly description = 'Gain 1 M€ for every energy production level you have';

  getScore(player: IPlayer) {
    return player.production.energy;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.EMPOWER}});
  }
}

// Adapted: only the "energy as M€" half is implemented (see the class comment above); the
// reverse "M€ as energy" half is dropped, matching Helion's own one-directional precedent.
class EmpowerPolicy01 extends Policy {
  readonly id = 'empp01' as const;
  readonly description = 'You may use energy as M€ (2 M€ per energy)';

  override onPolicyStartForPlayer(player: IPlayer): void {
    player.canUseEnergyAsMegaCredits = true;
  }

  override onPolicyEndForPlayer(player: IPlayer): void {
    player.canUseEnergyAsMegaCredits = false;
  }
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.applyOnProductionChangedEffect.
class EmpowerPolicy02 implements IPolicy {
  readonly id = 'empp02' as const;
  readonly description = 'Every time you raise or lower your energy production, gain 2 energy';
}

class EmpowerPolicy03 extends Policy {
  readonly id = 'empp03' as const;
  readonly description = 'You\'re considered having 2 more energy tags';

  override onPolicyStartForPlayer(player: IPlayer): void {
    player.tags.extraEnergyTags += 2;
  }

  override onPolicyEndForPlayer(player: IPlayer): void {
    player.tags.extraEnergyTags -= 2;
  }
}

export const EMPOWER_BONUS_1 = new EmpowerBonus01();
export const EMPOWER_BONUS_2 = new EmpowerBonus02();
export const EMPOWER_POLICY_1 = new EmpowerPolicy01();
export const EMPOWER_POLICY_2 = new EmpowerPolicy02();
export const EMPOWER_POLICY_3 = new EmpowerPolicy03();
export const EMPOWER_POLICY_4 = new ChooseTagPolicy('empp04', PartyName.EMPOWER, 'energy tag', () => [Tag.POWER]);
