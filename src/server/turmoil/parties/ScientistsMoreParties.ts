import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Tag} from '../../../common/cards/Tag';
import {Policy, IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {GlobalParameter} from '../../../common/GlobalParameter';
import {ChooseTagPolicy} from './ChooseTagPolicy';
import {SCIENTISTS_BONUS_1, SCIENTISTS_BONUS_2, SCIENTISTS_POLICY_2} from './Scientists';

const MARS_GLOBAL_PARAMETERS: ReadonlyArray<GlobalParameter> = [
  GlobalParameter.OXYGEN, GlobalParameter.TEMPERATURE, GlobalParameter.OCEANS,
];

/**
 * More Parties: the "Political Agendas" rework of Scientists. Bonuses A/B and policy 2 are
 * identical to the official party (reused directly); the rest are new.
 */
export class ScientistsMoreParties extends Party implements IParty {
  readonly name = PartyName.SCIENTISTS as const;
  readonly bonuses = [SCIENTISTS_BONUS_1, SCIENTISTS_BONUS_2];
  readonly policies = [
    SCIENTISTS_MORE_PARTIES_POLICY_1,
    SCIENTISTS_POLICY_2,
    SCIENTISTS_MORE_PARTIES_POLICY_3,
    SCIENTISTS_MORE_PARTIES_POLICY_4,
  ];
}

class ScientistsMorePartiesPolicy01 extends Policy {
  readonly id = 'sp01' as const;
  readonly description = 'All players are considered having 2 more science tags';

  override onPolicyStartForPlayer(player: IPlayer): void {
    player.tags.extraScienceTags += 2;
  }

  override onPolicyEndForPlayer(player: IPlayer): void {
    player.tags.extraScienceTags -= 2;
  }
}

// No behavior of its own -- like the official sp03, its effect is applied directly by
// TurmoilHandler.onGlobalParameterIncrease, restricted to Mars's 3 parameters (oxygen,
// temperature, oceans) rather than any global parameter, and adds a discard.
class ScientistsMorePartiesPolicy03 implements IPolicy {
  readonly id = 'sp03' as const;
  readonly description = 'When you raise a Mars global parameter, draw a card and discard a card, per step raised';
}

export const SCIENTISTS_MORE_PARTIES_POLICY_1 = new ScientistsMorePartiesPolicy01();
export const SCIENTISTS_MORE_PARTIES_POLICY_3 = new ScientistsMorePartiesPolicy03();
export const SCIENTISTS_MORE_PARTIES_POLICY_4 = new ChooseTagPolicy('sp04', PartyName.SCIENTISTS, 'science tag', () => [Tag.SCIENCE]);
export {MARS_GLOBAL_PARAMETERS};
