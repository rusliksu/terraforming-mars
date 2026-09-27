import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {SelectCard} from '../../inputs/SelectCard';
import {newProjectCard} from '../../createCard';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

type ImitatorData = {card?: CardName, generation?: number};

/** Copy an automated card another player has played into your hand; it costs 5 M€ less this generation. */
export class ProjectImitators extends Card implements IProjectCard {
  public data: ImitatorData = {};

  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.PROJECT_IMITATORS,
      cost: 6,

      metadata: {
        cardNumber: 'X75',
        renderData: CardRenderer.builder((b) => {
          b.cards(1).asterix().nbsp.megacredits(-5, {digit});
        }),
        description: 'Copy an AUTOMATED card another player has played into your hand. It costs 5 M€ less this generation.',
      },
    });
  }

  private targets(player: IPlayer): ReadonlyArray<IProjectCard> {
    const cards: Array<IProjectCard> = [];
    for (const opponent of player.opponents) {
      for (const card of opponent.playedCards) {
        if (card.type === CardType.AUTOMATED) {
          cards.push(card as IProjectCard);
        }
      }
    }
    return cards;
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.targets(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const targets = this.targets(player);
    return new SelectCard('Select a card to copy into your hand', 'Copy', targets, {showOwner: true})
      .andThen(([card]) => {
        const copy = newProjectCard(card.name);
        if (copy !== undefined) {
          player.cardsInHand.push(copy);
          this.data = {card: card.name, generation: player.game.generation};
          player.game.log('${0} copied ${1} into their hand', (b) => b.player(player).card(copy), {reservedFor: player});
        }
        return undefined;
      });
  }

  public override getCardDiscount(player: IPlayer, card: IProjectCard): number {
    if (this.data.card === card.name && this.data.generation === player.game.generation) {
      return 5;
    }
    return 0;
  }
}
