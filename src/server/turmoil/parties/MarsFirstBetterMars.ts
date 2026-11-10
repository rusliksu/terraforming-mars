import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {Bonus} from '../Bonus';
import {IPlayer} from '../../IPlayer';
import {MARS_FIRST_BONUS_2, MARS_FIRST_POLICY_1, MARS_FIRST_POLICY_2, MARS_FIRST_POLICY_3, MARS_FIRST_POLICY_4} from './MarsFirst';

/**
 * Better Mars: the official Mars First party, with its building-tag bonus counting Mars tags too.
 */
export class MarsFirstBetterMars extends Party implements IParty {
  readonly name = PartyName.MARS;
  readonly bonuses = [MARS_FIRST_BETTER_MARS_BONUS_1, MARS_FIRST_BONUS_2];
  readonly policies = [MARS_FIRST_POLICY_1, MARS_FIRST_POLICY_2, MARS_FIRST_POLICY_3, MARS_FIRST_POLICY_4];
}

class MarsFirstBetterMarsBonus01 extends Bonus {
  readonly id = 'mb01' as const;
  readonly description = 'Gain 1 M€ for every building and Mars tag you have';

  getScore(player: IPlayer) {
    return player.tags.count(Tag.BUILDING, 'raw') + player.tags.count(Tag.MARS, 'raw');
  }

  grantForPlayer(player: IPlayer): void {
    this.grantResourceForRulingBonus(player, Resource.MEGACREDITS, this.getScore(player), 'M€', PartyName.MARS);
  }
}

export const MARS_FIRST_BETTER_MARS_BONUS_1 = new MarsFirstBetterMarsBonus01();
