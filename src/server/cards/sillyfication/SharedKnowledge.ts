import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all, digit} from '../Options';

/** Tracks, per opponent, how many cards they've drawn so far this generation. */
type DrawCounts = {[playerId: string]: number};

export class SharedKnowledge extends Card implements IProjectCard {
  public data: DrawCounts = {};

  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SHARED_KNOWLEDGE,
      tags: [Tag.SCIENCE],
      cost: 11,
      victoryPoints: 1,

      requirements: {tag: Tag.SCIENCE, count: 4},

      metadata: {
        cardNumber: 'T20',
        renderData: CardRenderer.builder((b) => {
          b.effect('When an opponent draws their third card of a generation, draw 1 card.', (eb) => {
            eb.cards(3, {all, digit}).startEffect.cards(1);
          });
        }),
        description: 'Requires 4 science tags.',
      },
    });
  }

  public onProductionPhase(_player: IPlayer) {
    this.data = {};
  }

  public onCardsDrawn(cardOwner: IPlayer, drawingPlayer: IPlayer, count: number) {
    if (drawingPlayer.id === cardOwner.id) {
      return;
    }
    const before = this.data[drawingPlayer.id] ?? 0;
    const after = before + count;
    this.data[drawingPlayer.id] = after;
    if (before < 3 && after >= 3) {
      cardOwner.drawCard();
    }
  }
}
