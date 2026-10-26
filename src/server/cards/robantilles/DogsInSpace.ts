import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';
import {CardRenderer} from '../render/CardRenderer';

export class DogsInSpace extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.DOGS_IN_SPACE,
      tags: [Tag.ANIMAL, Tag.SPACE],
      cost: 16,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}, per: 2},

      metadata: {
        cardNumber: 'H22',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a Space tag, including this, add an animal to this card.', (eb) => {
            eb.tag(Tag.SPACE).startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('1 VP for every 2 animals on this card.');
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.tags.includes(Tag.SPACE)) {
      player.game.defer(new AddResourcesToCard(player, CardResource.ANIMAL, {filter: (c) => c.name === this.name}));
    }
  }
}
