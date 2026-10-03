import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';

export class VenusianWanderer extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_WANDERER,
      tags: [Tag.VENUS],
      cost: 8,
      requirements: {venus: 4},
      resourceType: CardResource.FLOATER,
      victoryPoints: {resourcesHere: {}, per: 3},

      metadata: {
        cardNumber: 'V93',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you play a Venus tag, add 1 floater to any card.', (eb) => {
            eb.tag(Tag.VENUS).startEffect.resource(CardResource.FLOATER);
          }).br;
          b.vpText('1 VP per 3 floaters on this card.');
        }),
        description: 'Requires Venus 4% or more.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const qty = player.tags.cardTagCount(card, Tag.VENUS);
    for (let i = 0; i < qty; i++) {
      player.game.defer(new AddResourcesToCard(player, CardResource.FLOATER, {count: 1}));
    }
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag) {
    if (tag === Tag.VENUS) {
      player.game.defer(new AddResourcesToCard(player, CardResource.FLOATER, {count: 1}));
    }
  }
}
