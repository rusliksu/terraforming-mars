import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Turmoil} from '../../turmoil/Turmoil';
import {SelectParty} from '../../inputs/SelectParty';
import {CardRenderer} from '../render/CardRenderer';

export class FirstManMonument extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.FIRST_MAN_MONUMENT,
      tags: [Tag.BUILDING],
      cost: 6,

      requirements: {party: PartyName.CENTRISTS},

      behavior: {
        tr: 1,
      },

      metadata: {
        cardNumber: 'SL36',
        renderData: CardRenderer.builder((b) => {
          b.delegates(2).tr(1);
        }),
        description: 'Requires that Centrists are ruling or that you have 2 delegates there. Add 1 delegate to ' +
          'a Turmoil party of your choice, then add 1 delegate to a different party of your choice. Raise your TR 1 step.',
      },
    });
  }

  private sendDelegate(player: IPlayer, turmoil: Turmoil, partyName: PartyName) {
    turmoil.sendDelegateToParty(player, partyName, player.game);
    player.totalDelegatesPlaced += 1;
    player.game.log('${0} sent a delegate to ${1}', (b) => b.player(player).partyName(partyName));
  }

  public override bespokePlay(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const allParties = turmoil.parties.map((party) => party.name);

    return new SelectParty('Select party to send a delegate (1 of 2)', 'Send delegate', allParties)
      .andThen((firstParty) => {
        this.sendDelegate(player, turmoil, firstParty);

        const remainingParties = allParties.filter((partyName) => partyName !== firstParty);
        if (remainingParties.length === 0) {
          return undefined;
        }

        return new SelectParty('Select a different party to send a delegate (2 of 2)', 'Send delegate', remainingParties)
          .andThen((secondParty) => {
            this.sendDelegate(player, turmoil, secondParty);
            return undefined;
          });
      });
  }
}
