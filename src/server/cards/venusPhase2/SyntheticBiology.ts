import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class SyntheticBiology extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SYNTHETIC_BIOLOGY,
      tags: [Tag.SCIENCE, Tag.MICROBE],
      cost: 12,

      metadata: {
        cardNumber: 'V54',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you add a microbe to any card, gain 1 M€.', (eb) => {
            eb.resource(CardResource.MICROBE).startEffect.megacredits(1);
          });
        }),
      },
    });
  }

  public onResourceAdded(player: IPlayer, card: ICard, count: number) {
    if (count <= 0 || card.resourceType !== CardResource.MICROBE) {
      return;
    }
    player.stock.add(Resource.MEGACREDITS, count, {log: true, from: {card: this}});
  }
}
