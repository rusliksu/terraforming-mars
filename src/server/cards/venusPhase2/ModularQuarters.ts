import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {TileType} from '../../../common/TileType';
import {Space} from '../../boards/Space';
import {BoardType} from '../../boards/BoardType';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';

export class ModularQuarters extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MODULAR_QUARTERS,
      cost: 18,

      behavior: {
        global: {venus: 1},
      },

      metadata: {
        cardNumber: 'V58',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever a Venus Habitat is placed, add 2 floaters to any card.', (eb) => {
            eb.city().startEffect.resource(CardResource.FLOATER, 2);
          });
        }),
        description: 'Raise Venus 1 step.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, _activePlayer: IPlayer, space: Space, boardType: BoardType): void {
    if (boardType !== BoardType.VENUS || space.tile?.tileType !== TileType.VENUS_CLOUD_CITY) {
      return;
    }
    cardOwner.game.defer(new AddResourcesToCard(cardOwner, CardResource.FLOATER, {count: 2}));
  }
}
