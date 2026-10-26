import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {IStandardProjectCard} from '../IStandardProjectCard';

export class Ecoplants extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ECOPLANTS,
      tags: [Tag.PLANT],
      cost: 10,
      victoryPoints: 1,

      requirements: {production: Resource.PLANTS},

      behavior: {
        greeneryDiscount: 1,
      },

      metadata: {
        cardNumber: 'H62',
        renderData: CardRenderer.builder((b) => {
          b.effect('Your Greenery tiles cost 1 plant less.', (eb) => {
            eb.greenery().startEffect.minus().plants(1);
          });
          b.br;
          b.effect('Cards and standard projects that place a Greenery tile cost 2 M€ less.', (eb) => {
            eb.greenery().startEffect.minus().megacredits(2);
          });
        }),
        description: 'Requires that you have Plant production.',
      },
    });
  }

  public override getCardDiscount(_player: IPlayer, card: IProjectCard): number {
    return card.behavior?.greenery !== undefined ? 2 : 0;
  }

  public getStandardProjectDiscount(_player: IPlayer, card: IStandardProjectCard): number {
    return card.name === CardName.GREENERY_STANDARD_PROJECT ? 2 : 0;
  }
}
