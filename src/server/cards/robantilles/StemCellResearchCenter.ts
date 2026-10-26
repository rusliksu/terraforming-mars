import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';
import {CardRenderer} from '../render/CardRenderer';
import {Board} from '../../boards/Board';
import {all} from '../Options';
import {Size} from '../../../common/cards/render/Size';

export class StemCellResearchCenter extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.STEM_CELL_RESEARCH_CENTER,
      tags: [Tag.MICROBE, Tag.BUILDING],
      cost: 12,

      behavior: {
        production: {megacredits: 1},
      },

      metadata: {
        cardNumber: 'H23',
        renderData: CardRenderer.builder((b) => {
          b.effect('Every time a city tile is placed, add a microbe to any card.', (eb) => {
            eb.city({size: Size.SMALL, all}).startEffect.resource(CardResource.MICROBE);
          }).br;
          b.production((pb) => pb.megacredits(1));
        }),
        description: 'Increase your M€ production 1 step.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, _activePlayer: IPlayer, space: Space) {
    if (Board.isCitySpace(space)) {
      cardOwner.game.defer(new AddResourcesToCard(cardOwner, CardResource.MICROBE));
    }
  }
}
