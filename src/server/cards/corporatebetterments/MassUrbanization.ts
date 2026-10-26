import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';

export class MassUrbanization extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MASS_URBANIZATION,
      tags: [Tag.MARS, Tag.CITY, Tag.BUILDING],
      cost: 69,
      victoryPoints: 3,

      requirements: {cities: 3},

      metadata: {
        cardNumber: 'B41',
        renderData: CardRenderer.builder((b) => {
          b.city().city().city();
        }),
        description: 'Requires that you have 3 cities. Place 3 city tiles.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getAvailableSpacesForType(player, 'city').length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.defer(new PlaceCityTile(player, {title: 'Select space for first city tile'}));
    game.defer(new PlaceCityTile(player, {title: 'Select space for second city tile'}));
    game.defer(new PlaceCityTile(player, {title: 'Select space for third city tile'}));
    return undefined;
  }
}
