import {OrOptions} from '../inputs/OrOptions';
import {SelectOption} from '../inputs/SelectOption';
import {IPlayer} from '../IPlayer';
import {PlayerInput} from '../PlayerInput';
import {DeferredAction} from './DeferredAction';
import {Priority} from './Priority';
import {IParty} from '../turmoil/parties/IParty';
import {BonusId, PolicyId} from '../../common/turmoil/Types';
import {policyDescription} from '../turmoil/Policy';
import {message} from '../logs/MessageBuilder';

/** Which part(s) of a party's agenda this action lets the player pick. */
export type AgendaChoice = 'bonus' | 'policy' | 'both';

/**
 * More Parties: lets a player pick a party's new bonus and/or policy.
 * - 'both' fires when a player becomes (or remains) a non-ruling party's leader: they choose
 *   the new bonus, then immediately the new policy too.
 * - 'bonus' fires the same way, but for the currently-ruling party -- whose policy stays
 *   locked for the rest of the generation (see PoliticalAgendas.onPartyLeaderChange).
 * - 'policy' fires when a chairman is confirmed/re-confirmed for the ruling party: they pick
 *   its policy for the generation about to start (see PoliticalAgendas.setNextAgenda).
 */
export class ChooseNewPartyAgenda extends DeferredAction {
  constructor(
    player: IPlayer,
    public party: IParty,
    public choice: AgendaChoice,
    public onSelect: (bonusId: BonusId | undefined, policyId: PolicyId | undefined) => void,
  ) {
    super(player, Priority.DEFAULT);
  }

  public execute(): PlayerInput {
    if (this.choice === 'policy') {
      return this.selectPolicy(undefined);
    }
    return this.selectBonus();
  }

  private selectBonus(): PlayerInput {
    const players = this.player.game.players;
    const bonusOptions = this.party.bonuses.map((bonus) => {
      const description = message(
        bonus.description + ' (${0})',
        (b) => b.rawString(players.map((player) => player.name + ': ' + bonus.getScore(player)).join(' / ')),
      );
      return new SelectOption(description).andThen(() => {
        if (this.choice === 'both') {
          return this.selectPolicy(bonus.id);
        }
        this.onSelect(bonus.id, undefined);
        return undefined;
      });
    });

    return new OrOptions(...bonusOptions)
      .setTitle(message('As leader of the ${0}, select their new bonus', (b) => b.party(this.party)));
  }

  private selectPolicy(bonusId: BonusId | undefined): PlayerInput {
    const policyOptions = this.party.policies.map((policy) => {
      return new SelectOption(policyDescription(policy, this.player), 'Select').andThen(() => {
        this.onSelect(bonusId, policy.id);
        return undefined;
      });
    });

    return new OrOptions(...policyOptions)
      .setTitle(message('Select a new ${0} policy', (b) => b.party(this.party)));
  }
}
