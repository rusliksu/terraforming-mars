import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class UranusSeaCreatures extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.URANUS_SEA_CREATURES,
      tags: [Tag.ANIMAL, Tag.JOVIAN],
      cost: 16,
      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},

      requirements: {tag: Tag.JOVIAN, count: 3, all},

      metadata: {
        cardNumber: 'X41',
        renderData: CardRenderer.builder((b) => {
          b.effect('Each time any Jovian tag is put into play, including this, add 1 animal to this card.', (eb) => {
            eb.tag(Tag.JOVIAN, {all}).startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('1 VP per animal on this card.');
        }),
        description: 'Requires ANY 3 Jovian tags in play.',
      },
    });
  }

  public onCardPlayedByAnyPlayer(cardOwner: IPlayer, card: ICard, activePlayer: IPlayer): void {
    const qty = activePlayer.tags.cardTagCount(card, Tag.JOVIAN);
    if (qty > 0) {
      cardOwner.addResourceTo(this, {qty, log: true});
    }
  }

  public onNonCardTagAddedByAnyPlayer(cardOwner: IPlayer, tag: Tag): void {
    if (tag === Tag.JOVIAN) {
      cardOwner.addResourceTo(this, {qty: 1, log: true});
    }
  }
}
