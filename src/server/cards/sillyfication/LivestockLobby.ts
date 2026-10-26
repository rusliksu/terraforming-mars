import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class LivestockLobby extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.LIVESTOCK_LOBBY,
      tags: [Tag.ANIMAL],
      cost: 10,

      requirements: {tag: Tag.ANIMAL, count: 2},

      behavior: {
        production: {plants: -1},
      },

      metadata: {
        cardNumber: 'X42',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().plants(1)).br;
          b.effect('When any player adds an animal to a card, that player gains 1 plant.', (eb) => {
            eb.resource(CardResource.ANIMAL, {all}).startEffect.plants(1, {all});
          }).br;
          b.effect('When you add an animal to a card, you gain 1 M€.', (eb) => {
            eb.resource(CardResource.ANIMAL).startEffect.megacredits(1);
          });
        }),
        description: 'Requires 2 animal tags. Decrease your plant production 1 step.',
      },
    });
  }

  public onResourceAddedByAnyPlayer(cardOwner: IPlayer, activePlayer: IPlayer, card: ICard, count: number) {
    if (card.resourceType !== CardResource.ANIMAL) {
      return;
    }
    activePlayer.stock.add(Resource.PLANTS, count, {log: true});
    if (activePlayer.id === cardOwner.id) {
      cardOwner.stock.add(Resource.MEGACREDITS, count, {log: true});
    }
  }
}
