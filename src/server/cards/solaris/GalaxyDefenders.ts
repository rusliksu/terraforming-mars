import {ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class GalaxyDefenders extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GALAXY_DEFENDERS,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 17,

      resourceType: CardResource.FIGHTER,
      victoryPoints: {resourcesHere: {}},

      metadata: {
        cardNumber: 'So43',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you play a card with a Jovian tag, including this, gain 1 M€ and add 1 fighter resource to this card.', (eb) => {
            eb.tag(Tag.JOVIAN).startEffect.megacredits(1).nbsp.resource(CardResource.FIGHTER);
          }).br;
          b.vpText('1 VP for every fighter on this card.');
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const jovianTags = player.tags.cardTagCount(card, Tag.JOVIAN);
    if (jovianTags > 0) {
      player.stock.add(Resource.MEGACREDITS, jovianTags, {log: true});
      player.addResourceTo(this, {qty: jovianTags, log: true});
    }
  }
}
