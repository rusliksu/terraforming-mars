import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class RoundingError extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ROUNDING_ERROR,
      tags: [Tag.SCIENCE],
      cost: 4,

      requirements: {tag: Tag.SCIENCE, count: 2, max: true},

      metadata: {
        cardNumber: 'X20',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a card with an odd base cost, you pay 1 M€ less for it.', (eb) => {
            eb.cards(1).asterix().startEffect.megacredits(-1);
          });
        }),
        description: 'Requires that you have no more than 2 science tags.',
      },
    });
  }

  public override getCardDiscount(_player: IPlayer, card: IProjectCard): number {
    return card.cost % 2 === 1 ? 1 : 0;
  }
}
