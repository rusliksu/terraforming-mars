import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class RooftopGardens extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ROOFTOP_GARDENS,
      tags: [Tag.PLANT],
      cost: 15,

      requirements: {oxygen: 5},

      metadata: {
        cardNumber: 'B19',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever a city tile is placed, gain 2 plants.', (eb) => {
            eb.city({all}).startEffect.plants(2);
          });
        }),
        description: 'Requires 5% oxygen.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, _activePlayer: IPlayer, space: Space) {
    if (Board.isCitySpace(space)) {
      cardOwner.stock.add(Resource.PLANTS, 2, {log: true});
    }
  }
}
