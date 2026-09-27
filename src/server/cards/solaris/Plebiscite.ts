import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Turmoil} from '../../turmoil/Turmoil';
import {PoliticalAgendas} from '../../turmoil/PoliticalAgendas';
import {SelectParty} from '../../inputs/SelectParty';
import {PlayerInput} from '../../PlayerInput';

/**
 * Plebiscite (Solaris, fan): a one-time "coup" -- unlike the normal delegate-count-driven
 * leadership (see turmoil/parties/Party.checkPartyLeader), this directly overwrites a
 * party's leader, matching `party.partyLeader`'s existing role as a plain mutable field on
 * `IParty`. The dislodged leader isn't removed from the party -- they simply stop being its
 * leader, which per Party's own model means they're just an ordinary delegate there again.
 * Replicates the bookkeeping `Party.setPartyLeader` normally does (PoliticalAgendas hook)
 * since that method is private and only reachable via the normal delegate-count path.
 */
export class Plebiscite extends Card {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.PLEBISCITE,
      tags: [Tag.EARTH],
      cost: 3,

      requirements: {party: PartyName.POPULISTS},

      metadata: {
        cardNumber: 'SOL19',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Remove the leader of any Turmoil party. You become that party\'s new leader.');
        }),
        description: 'Requires that Populists are ruling or that you have 2 delegates there.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const turmoil = Turmoil.getTurmoil(player.game);
    return turmoil.parties.some((party) => party.partyLeader !== undefined && party.partyLeader !== player);
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    const game = player.game;
    const turmoil = Turmoil.getTurmoil(game);
    const eligibleParties = turmoil.parties.filter((party) => party.partyLeader !== undefined && party.partyLeader !== player);

    return new SelectParty('Select a party to remove the leader from and take over as leader', 'Select', eligibleParties.map((party) => party.name))
      .andThen((partyName) => {
        const party = turmoil.getPartyByName(partyName);
        game.log('${0} ousted the leader of ${1} and became its new leader', (b) => b.player(player).party(party));
        party.partyLeader = player;
        PoliticalAgendas.onPartyLeaderChange(turmoil, party, player, game);
        return undefined;
      });
  }
}
