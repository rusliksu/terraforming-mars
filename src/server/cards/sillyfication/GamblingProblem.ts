import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class GamblingProblem extends Card implements IProjectCard {
  /** The combined tags of the two cards revealed and discarded when this was played. */
  public data: Array<Tag> = [];

  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GAMBLING_PROBLEM,
      tags: [],
      cost: 5,

      metadata: {
        cardNumber: 'T25',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Reveal and discard the top 2 cards of the deck. This card gains every tag of those 2 cards, combined.', true);
        }),
      },
    });
  }

  public override get tags(): Array<Tag> {
    return this.data;
  }

  public override bespokePlay(player: IPlayer) {
    const deck = player.game.projectDeck;
    const card1 = deck.drawOrThrow(player.game);
    deck.discard(card1);
    const card2 = deck.drawOrThrow(player.game);
    deck.discard(card2);
    player.game.log('${0} revealed and discarded ${1} and ${2}', (b) => b.player(player).card(card1).card(card2));
    this.data = [...card1.tags, ...card2.tags];
    return undefined;
  }
}
