import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Turmoil} from '../../turmoil/Turmoil';
import {CardRequirement} from './CardRequirement';
import {RequirementType} from '../../../common/cards/RequirementType';
import {sum} from '../../../common/utils/utils';

const DEFAULT_MIN_DELEGATES = 2;
const CONGLOMERATES_MIN_DELEGATES = 3;

/**
 * Evaluate whether a player can satisfy a Turmoil party requirement.
 *
 * A player satisfies a party requirement if the party is currently ruling, or if
 * contains two of the player's delegates (three, plus any teammate's, in a Conglomerates
 * game), or if the player has Mars Frontier Alliance in play and the party's policy tile
 * on it.
 */
export class PartyRequirement extends CardRequirement {
  public readonly type = RequirementType.PARTY;
  constructor(public readonly party: PartyName) {
    super();
  }

  public satisfies(player: IPlayer): boolean {
    const turmoil = Turmoil.getTurmoil(player.game);
    if (turmoil.rulingParty.name === this.party || player.alliedParty?.partyName === this.party ) {
      return true;
    }

    // More Parties games randomly select 6 of the 12 available parties (see
    // Turmoil.createParties) -- this.party may not be one of them, in which case the
    // requirement simply can't be satisfied (it can never be ruling or hold delegates).
    if (!turmoil.parties.some((p) => p.name === this.party)) {
      return false;
    }

    const party = turmoil.getPartyByName(this.party);
    if (player.game.gameOptions.conglomeratesExpansion) {
      const teammates = player.teammates();
      const delegates = party.delegates.count(player) + sum(teammates.map((teammate) => party.delegates.count(teammate)));
      return delegates >= CONGLOMERATES_MIN_DELEGATES;
    }
    return party.delegates.count(player) >= DEFAULT_MIN_DELEGATES;
  }
}
