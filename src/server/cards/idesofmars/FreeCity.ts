import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';

export class FreeCity extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.FREE_CITY,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 8,
      victoryPoints: 2,

      requirements: {party: PartyName.POPULISTS},

      metadata: {
        cardNumber: '140',
        renderData: CardRenderer.builder((b) => {
          b.city().asterix();
        }),
        description: 'Requires that Populists are ruling or that you have 2 delegates there. ' +
          'Place a city tile in a non-reserved area, but do not place your marker on it. ' +
          'This city belongs to no player for scoring and effect purposes.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getAvailableSpacesForType(player, 'city').length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceCityTile(player)).andThen((space) => {
      if (space !== undefined) {
        space.player = undefined;
        player.game.log('${0} places an unowned city at ${1}', (b) => b.player(player).space(space));
      }
      return undefined;
    });
    return undefined;
  }
}
