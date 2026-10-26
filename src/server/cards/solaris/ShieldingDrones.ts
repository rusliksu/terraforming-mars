import {ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

export class ShieldingDrones extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SHIELDING_DRONES,
      tags: [Tag.SPACE],
      cost: 11,

      resourceType: CardResource.FIGHTER,
      victoryPoints: {resourcesHere: {}, per: 5},

      metadata: {
        cardNumber: 'So46',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you play a card with a Space, Building, or Science tag, including this, add 1 fighter resource to this card.', (eb) => {
            eb.tag(Tag.SPACE).slash().tag(Tag.BUILDING).slash().tag(Tag.SCIENCE).startEffect.resource(CardResource.FIGHTER);
          }).br;
          b.vpText('1 VP for every 5 fighters on this card.');
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const count = player.tags.cardTagCount(card, [Tag.SPACE, Tag.BUILDING, Tag.SCIENCE]);
    if (count > 0) {
      player.addResourceTo(this, {qty: count, log: true});
    }
  }
}
