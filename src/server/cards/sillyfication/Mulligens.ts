import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {DiscardCards} from '../../deferredActions/DiscardCards';
import {DrawCards} from '../../deferredActions/DrawCards';
import {Priority} from '../../deferredActions/Priority';

export class Mulligens extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MULLIGENS,
      tags: [],
      cost: 9,
      victoryPoints: 2,

      metadata: {
        cardNumber: 'T36',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Each player may discard any number of cards, up to the generation number, and draw that many cards.', true);
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    for (const p of game.players) {
      const max = Math.min(p.cardsInHand.length, game.generation);
      game.defer(new DiscardCards(p, 0, max), Priority.DISCARD_AND_DRAW)
        .andThen((cards) => game.defer(DrawCards.keepAll(p, cards.length)));
    }
    return undefined;
  }
}
