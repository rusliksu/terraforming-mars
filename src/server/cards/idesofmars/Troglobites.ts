import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {isSpecialTileSpace} from '../../boards/Board';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';
import {CardRenderer} from '../render/CardRenderer';

export class Troglobites extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.TROGLOBITES,
      tags: [Tag.ANIMAL],
      cost: 10,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}, each: 3, per: 4},
      requirements: {oxygen: 5},

      metadata: {
        cardNumber: '139',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place a Special tile, add an animal to this card.', (eb) => {
            eb.text('Special tile').startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('3 VP for every 4 animals on this card.');
        }),
        description: 'Requires 5% oxygen.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (cardOwner.id === activePlayer.id && isSpecialTileSpace(space)) {
      cardOwner.game.defer(new AddResourcesToCard(cardOwner, CardResource.ANIMAL, {filter: (c) => c.name === this.name}));
    }
  }
}
