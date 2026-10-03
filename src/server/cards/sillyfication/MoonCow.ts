import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {BoardType} from '../../boards/BoardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MoonCow extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MOON_COW,
      tags: [Tag.MOON, Tag.ANIMAL],
      cost: 12,

      requirements: {habitatTiles: 2},

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}, per: 2},

      metadata: {
        cardNumber: 'T01',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any tile is placed on the Moon, add an animal to this card.', (eb) => {
            eb.emptyTile().startEffect.resource(CardResource.ANIMAL);
          }).br;
          b.resource(CardResource.ANIMAL);
        }),
        description: 'Requires 2 habitat tiles on the Moon. Add 1 animal to this card when played.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.addResourceTo(this, {qty: 1, log: true});
    return undefined;
  }

  public onTilePlaced(cardOwner: IPlayer, _activePlayer: IPlayer, _space: Space, boardType: BoardType) {
    if (boardType === BoardType.MOON) {
      cardOwner.addResourceTo(this, {qty: 1, log: true});
    }
  }
}
