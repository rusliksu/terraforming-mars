import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Resource} from '../../../common/Resource';
import {Bonus} from '../Bonus';
import {IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {MIN_TEMPERATURE} from '../../../common/constants';
import {TITLES} from '../../inputs/titles';
import {KELVINISTS_BONUS_1, KELVINISTS_POLICY_4} from './Kelvinists';

/**
 * More Parties: the "Political Agendas" rework of Kelvinists. Bonus A and policy 4 are
 * identical to the official party (reused directly); the rest are new.
 */
export class KelvinistsMoreParties extends Party implements IParty {
  readonly name = PartyName.KELVINISTS;
  readonly bonuses = [KELVINISTS_BONUS_1, KELVINISTS_MORE_PARTIES_BONUS_2];
  readonly policies = [
    KELVINISTS_MORE_PARTIES_POLICY_1,
    KELVINISTS_MORE_PARTIES_POLICY_2,
    KELVINISTS_MORE_PARTIES_POLICY_3,
    KELVINISTS_POLICY_4,
  ];
}

// The source material describes an "individual temperature track" -- a per-player mechanic
// this codebase doesn't have. Adapted to the shared global temperature track instead.
class KelvinistsMorePartiesBonus02 extends Bonus {
  readonly id = 'kb02' as const;
  readonly description = 'Gain 2 M€ for every step on the temperature track';

  getScore(player: IPlayer) {
    return (player.game.getTemperature() - MIN_TEMPERATURE) / 2;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player) * 2, {log: true, from: {partyName: PartyName.KELVINISTS}});
  }
}

// No behavior of its own -- like the official kp02, its effect is applied directly by
// TurmoilHandler.onGlobalParameterIncrease.
class KelvinistsMorePartiesPolicy01 implements IPolicy {
  readonly id = 'kp01' as const;
  readonly description = 'When you raise temperature, gain 3 M€ per step raised';
}

class KelvinistsMorePartiesPolicy02 implements IPolicy {
  readonly id = 'kp02' as const;
  readonly description = 'Action: lower your heat production 2 steps, gain 1 TR';

  canAct(player: IPlayer): boolean {
    return player.production.heat >= 2;
  }

  action(player: IPlayer) {
    const game = player.game;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.KELVINISTS));
    player.production.add(Resource.HEAT, -2, {log: true});
    player.increaseTerraformRating(1, {log: true});
    return undefined;
  }
}

class KelvinistsMorePartiesPolicy03 implements IPolicy {
  readonly id = 'kp03' as const;
  readonly description = 'Action: pay 9 M€ to raise your heat production 2 steps';

  canAct(player: IPlayer): boolean {
    return player.canAfford(9);
  }

  action(player: IPlayer) {
    const game = player.game;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.KELVINISTS));
    game.defer(new SelectPaymentDeferred(player, 9, {title: TITLES.payForPartyAction(PartyName.KELVINISTS)}))
      .andThen(() => {
        player.production.add(Resource.HEAT, 2, {log: true});
      });
    return undefined;
  }
}

export const KELVINISTS_MORE_PARTIES_BONUS_2 = new KelvinistsMorePartiesBonus02();
export const KELVINISTS_MORE_PARTIES_POLICY_1 = new KelvinistsMorePartiesPolicy01();
export const KELVINISTS_MORE_PARTIES_POLICY_2 = new KelvinistsMorePartiesPolicy02();
export const KELVINISTS_MORE_PARTIES_POLICY_3 = new KelvinistsMorePartiesPolicy03();
