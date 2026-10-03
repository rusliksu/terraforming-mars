import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PlaceGreeneryTile} from '../../deferredActions/PlaceGreeneryTile';

export class GuerrillaGardening extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GUERRILLA_GARDENING,
      tags: [Tag.PLANT, Tag.PLANT],
      cost: 29,

      requirements: {oxygen: 7},

      metadata: {
        cardNumber: 'X52',
        renderData: CardRenderer.builder((b) => {
          b.greenery().greenery();
        }),
        description: 'Requires 7% oxygen. Place 2 greenery tiles.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getAvailableSpacesForGreenery(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceGreeneryTile(player));
    player.game.defer(new PlaceGreeneryTile(player));
    return undefined;
  }
}
