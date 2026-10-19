import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {DiscardCards} from '../../deferredActions/DiscardCards';
import {DrawCards} from '../../deferredActions/DrawCards';
import {Priority} from '../../deferredActions/Priority';

export class Mulligans extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MULLIGANS,
      tags: [Tag.SCIENCE],
      cost: 14,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'T35',
        renderData: CardRenderer.builder((b) => {
          b.cards(1).br;
          b.plainText('Draw 1 card. Then, each player may discard any number of cards, up to their science tag count, and draw that many cards.', true);
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    player.drawCard();
    for (const p of game.players) {
      const max = Math.min(p.cardsInHand.length, p.tags.count(Tag.SCIENCE));
      game.defer(new DiscardCards(p, 0, max), Priority.DISCARD_AND_DRAW)
        .andThen((cards) => game.defer(DrawCards.keepAll(p, cards.length)));
    }
    return undefined;
  }
}
