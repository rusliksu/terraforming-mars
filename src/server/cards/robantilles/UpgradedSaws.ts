import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {Board} from '../../boards/Board';
import {Size} from '../../../common/cards/render/Size';

export class UpgradedSaws extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.UPGRADED_SAWS,
      tags: [Tag.SCIENCE],
      cost: 9,

      metadata: {
        cardNumber: 'H13',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place a greenery tile, increase your M€ production 1 step.', (eb) => {
            eb.greenery({size: Size.SMALL}).startEffect.production((pb) => pb.megacredits(1));
          });
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (cardOwner.id === activePlayer.id && Board.isGreenerySpace(space)) {
      cardOwner.production.add(Resource.MEGACREDITS, 1, {log: true});
    }
  }
}
