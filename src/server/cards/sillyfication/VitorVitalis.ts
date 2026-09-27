import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class VitorVitalis extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VITOR_VITALIS,
      tags: [Tag.SCIENCE],
      cost: 20,
      victoryPoints: 3,

      requirements: {tag: Tag.SCIENCE, count: 4},

      metadata: {
        cardNumber: 'X48',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a card with a non-negative VP icon, including this, gain 1 M€.', (eb) => {
            eb.vpIcon().asterix().startEffect.megacredits(1);
          });
        }),
        description: 'Requires 4 science tags.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    const victoryPoints = card.metadata.victoryPoints;
    if (victoryPoints === undefined) {
      return;
    }
    const value = typeof victoryPoints === 'number' ? victoryPoints : victoryPoints.points;
    if (value <= 0) {
      return;
    }
    player.stock.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}});
  }
}
