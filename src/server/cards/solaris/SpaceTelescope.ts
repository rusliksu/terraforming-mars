import {IProjectCard} from '../IProjectCard';
import {ICard} from '../ICard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

export class SpaceTelescope extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SPACE_TELESCOPE,
      tags: [Tag.SPACE, Tag.SCIENCE],
      cost: 9,

      requirements: {tag: Tag.SCIENCE},
      resourceType: CardResource.DATA,
      victoryPoints: {resourcesHere: {}, per: 2},

      metadata: {
        cardNumber: 'SL09',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a space event, add 1 data to this card.', (eb) => {
            eb.tag(Tag.SPACE).tag(Tag.EVENT).startEffect.resource(CardResource.DATA);
          }).br;
          b.vpText('1 VP for every 2 data on this card.');
        }),
        description: 'Requires 1 Science tag.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.type === CardType.EVENT && card.tags.includes(Tag.SPACE)) {
      player.addResourceTo(this, {qty: 1, log: true});
    }
  }
}
