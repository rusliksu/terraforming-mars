import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';

export class CorruptedDelegate extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.CORRUPTED_DELEGATE,
      tags: [],
      cost: 0,

      requirements: {party: PartyName.BUREAUCRATS},

      metadata: {
        cardNumber: 'H10',
        renderData: CardRenderer.builder((b) => {
          b.text('carry out 3 more actions immediately', {size: Size.SMALL, uppercase});
        }),
        // Printed card text has a typo, "Bureacrats"; the requirement itself is Bureaucrats.
        description: 'Requires that the Bureaucrats are ruling or that you have 2 delegates there. ' +
          'Take 3 more actions this turn.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.availableActionsThisRound += 3;
    return undefined;
  }
}
