import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {Bonus} from '../Bonus';
import {Policy, IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {TITLES} from '../../inputs/titles';
import {ChooseTagPolicy} from './ChooseTagPolicy';
import {UNITY_BONUS_1, UNITY_POLICY_1} from './Unity';

const PLANET_TAGS_EXCEPT_MARS = [Tag.VENUS, Tag.EARTH, Tag.JOVIAN];

/**
 * More Parties: the "Political Agendas" rework of Unity. Bonus A ("every planet tag except
 * Mars") is effectively identical to the official ub01 (Venus/Earth/Jovian, the only tags that
 * fit that description in this codebase) and is reused directly; policy 1 is also identical.
 * The rest are new.
 */
export class UnityMoreParties extends Party implements IParty {
  readonly name = PartyName.UNITY;
  readonly bonuses = [UNITY_BONUS_1, UNITY_MORE_PARTIES_BONUS_2];
  readonly policies = [
    UNITY_POLICY_1,
    UNITY_MORE_PARTIES_POLICY_2,
    UNITY_MORE_PARTIES_POLICY_3,
    UNITY_MORE_PARTIES_POLICY_4,
  ];
}

class UnityMorePartiesBonus02 extends Bonus {
  readonly id = 'ub02' as const;
  readonly description = 'Gain 1 M€ for every Space tag you have and every titanium production level';

  getScore(player: IPlayer) {
    return player.tags.count(Tag.SPACE, 'raw') + player.production.titanium;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.UNITY}});
  }
}

class UnityMorePartiesPolicy02 implements IPolicy {
  readonly id = 'up02' as const;
  readonly description = 'Action: pay 10 M€ to gain a trade fleet';

  canAct(player: IPlayer): boolean {
    return player.game.gameOptions.coloniesExtension && player.canAfford(10);
  }

  action(player: IPlayer) {
    const game = player.game;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.UNITY));
    game.defer(new SelectPaymentDeferred(player, 10, {title: TITLES.payForPartyAction(PartyName.UNITY)}))
      .andThen(() => {
        player.colonies.increaseFleetSize();
      });
    return undefined;
  }
}

class UnityMorePartiesPolicy03 extends Policy {
  readonly id = 'up03' as const;
  readonly description = 'You\'re considered having 2 more Space tags';

  override onPolicyStartForPlayer(player: IPlayer): void {
    player.tags.extraSpaceTags += 2;
  }

  override onPolicyEndForPlayer(player: IPlayer): void {
    player.tags.extraSpaceTags -= 2;
  }
}

export const UNITY_MORE_PARTIES_BONUS_2 = new UnityMorePartiesBonus02();
export const UNITY_MORE_PARTIES_POLICY_2 = new UnityMorePartiesPolicy02();
export const UNITY_MORE_PARTIES_POLICY_3 = new UnityMorePartiesPolicy03();
export const UNITY_MORE_PARTIES_POLICY_4 = new ChooseTagPolicy(
  'up04', PartyName.UNITY, 'a planet tag (except Mars) or Space tag', () => [...PLANET_TAGS_EXCEPT_MARS, Tag.SPACE]);
