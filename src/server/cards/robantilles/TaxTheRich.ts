import {IPlayer} from '../../IPlayer';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';
import {any} from '../render/DynamicVictoryPoints';

export class TaxTheRich extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.TAX_THE_RICH,
      tags: [],
      cost: 3,
      victoryPoints: 'special',

      requirements: {party: PartyName.POPULISTS},

      metadata: {
        cardNumber: 'H69',
        renderData: CardRenderer.builder((b) => {
          b.text('place in an opponent\'s event pile', {size: Size.SMALL, uppercase});
        }),
        description: 'Requires that the Populists are ruling or that you have 2 delegates there. ' +
          'Place this card in an opponent\'s event pile.',
        victoryPoints: any(-2),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.opponents.length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    return new SelectPlayer(player.opponents, 'Select player to place this card on', 'Select')
      .andThen((targetPlayer: IPlayer) => {
        targetPlayer.playedCards.push(this);
        player.game.log('${0} placed ${1} in ${2}\'s event pile', (b) => b.player(player).card(this).player(targetPlayer));
        return undefined;
      });
  }

  public override getVictoryPoints() {
    return -2;
  }
}
