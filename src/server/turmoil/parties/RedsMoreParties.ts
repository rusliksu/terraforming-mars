import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IBonus} from '../Bonus';
import {IPolicy} from '../Policy';
import {IGame} from '../../IGame';
import {IPlayer} from '../../IPlayer';
import {SpaceType} from '../../../common/boards/SpaceType';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {TITLES} from '../../inputs/titles';
import {REDS_BONUS_1, REDS_POLICY_1} from './Reds';

function marsTileCount(player: IPlayer): number {
  return player.game.board.spaces.filter((space) =>
    space.tile !== undefined && space.player === player && space.spaceType !== SpaceType.COLONY).length;
}

/**
 * More Parties: the "Political Agendas" rework of Reds. Bonus A and policy 1 are identical (or,
 * for policy 1, close enough in spirit -- both are the core "pay 3 M€ per TR step" Reds tax) to
 * the official party and are reused directly. The rest are new.
 */
export class RedsMoreParties extends Party implements IParty {
  readonly name = PartyName.REDS;
  readonly bonuses = [REDS_BONUS_1, REDS_MORE_PARTIES_BONUS_2];
  readonly policies = [
    REDS_POLICY_1,
    REDS_MORE_PARTIES_POLICY_2,
    REDS_MORE_PARTIES_POLICY_3,
    REDS_MORE_PARTIES_POLICY_4,
  ];
}

class RedsMorePartiesBonus02 implements IBonus {
  readonly id = 'rb02' as const;
  readonly description = 'The player(s) with the least tiles on Mars gains 1 TR';

  getScore(player: IPlayer): number {
    return marsTileCount(player);
  }

  grant(game: IGame) {
    const min = Math.min(...game.players.map(marsTileCount));
    game.players.forEach((player) => {
      if (marsTileCount(player) === min) {
        player.increaseTerraformRating();
      }
    });
  }
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.applyOnStandardProjectEffect.
class RedsMorePartiesPolicy02 implements IPolicy {
  readonly id = 'rp02' as const;
  readonly description = 'Discard 1 card every time you play a standard project';
}

class RedsMorePartiesPolicy03 implements IPolicy {
  readonly id = 'rp03' as const;
  readonly description = 'Pay 3 M€ every time you place a tile on Mars';

  onTilePlaced(player: IPlayer) {
    const amount = Math.min(player.megaCredits, 3);
    if (amount > 0) {
      player.game.defer(new SelectPaymentDeferred(player, amount, {title: TITLES.payForPartyAction(PartyName.REDS)}));
    }
  }
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.onGlobalParameterIncrease.
class RedsMorePartiesPolicy04 implements IPolicy {
  readonly id = 'rp04' as const;
  readonly description = 'When you raise a Mars global parameter, decrease your M€ production 1 step per step raised';
}

export const REDS_MORE_PARTIES_BONUS_2 = new RedsMorePartiesBonus02();
export const REDS_MORE_PARTIES_POLICY_2 = new RedsMorePartiesPolicy02();
export const REDS_MORE_PARTIES_POLICY_3 = new RedsMorePartiesPolicy03();
export const REDS_MORE_PARTIES_POLICY_4 = new RedsMorePartiesPolicy04();
export {marsTileCount};
