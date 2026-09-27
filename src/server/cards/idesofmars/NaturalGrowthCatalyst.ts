import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {PlaceGreeneryTile} from '../../deferredActions/PlaceGreeneryTile';

export class NaturalGrowthCatalyst extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.NATURAL_GROWTH_CATALYST,
      tags: [Tag.PLANT],
      cost: 20,

      requirements: {oceans: 8},

      metadata: {
        cardNumber: 'Im62',
        renderData: CardRenderer.builder((b) => {
          b.greenery().greenery();
        }),
        description: 'Requires 8 oceans. Place 2 greenery tiles (this also raises oxygen, as normal).',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getAvailableSpacesForGreenery(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.defer(new PlaceGreeneryTile(player));
    game.defer(new PlaceGreeneryTile(player));
    return undefined;
  }
}
