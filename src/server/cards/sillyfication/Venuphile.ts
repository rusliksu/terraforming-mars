import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Venuphile extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUPHILE,
      tags: [Tag.VENUS],
      cost: 17,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'T03',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a Venus tag, you pay 1 M€ less for every 2 Venus tags you have, to a maximum of 5 M€.', (eb) => {
            eb.tag(Tag.VENUS).startEffect.megacredits(1).slash().tag(Tag.VENUS, 2);
          });
        }),
      },
    });
  }

  public override getCardDiscount(player: IPlayer, card: IProjectCard): number {
    if (!card.tags.includes(Tag.VENUS)) {
      return 0;
    }
    return Math.min(Math.floor(player.tags.count(Tag.VENUS) / 2), 5);
  }
}
