import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {digit} from '../Options';

export class PeerReview extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.PEER_REVIEW,
      tags: [Tag.SCIENCE],
      cost: 8,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'X11',
        renderData: CardRenderer.builder((b) => {
          b.cards(3, {digit}).colon().megacredits(5);
        }),
        description: 'Look at the top 3 cards of the deck. Gain 5 M€.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const drawPile = player.game.projectDeck.drawPile;
    // The deck's top is the end of the array. Peek without disturbing the order.
    const top = drawPile.slice(-3).reverse();
    if (top.length > 0) {
      player.game.log('${0} peer-reviewed the top ${1} of the deck', (b) => {
        b.string('You');
        b.cards(top);
      }, {reservedFor: player});
    }
    player.stock.add(Resource.MEGACREDITS, 5, {log: true});
    return undefined;
  }
}
