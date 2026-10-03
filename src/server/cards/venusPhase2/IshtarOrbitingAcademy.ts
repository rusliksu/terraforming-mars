import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class IshtarOrbitingAcademy extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ISHTAR_ORBITING_ACADEMY,
      tags: [Tag.VENUS, Tag.EARTH, Tag.SPACE],
      cost: 15,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'V72',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you play a Science tag, gain 2 M€.', (eb) => {
            eb.tag(Tag.SCIENCE).startEffect.megacredits(2);
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const qty = player.tags.cardTagCount(card, Tag.SCIENCE);
    if (qty > 0) {
      player.stock.add(Resource.MEGACREDITS, 2 * qty, {log: true, from: {card: this}});
    }
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag) {
    if (tag === Tag.SCIENCE) {
      player.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {card: this}});
    }
  }
}
