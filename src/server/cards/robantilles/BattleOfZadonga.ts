import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {Board} from '../../boards/Board';

/**
 * Sets `Space.coOwner`, the shared-ownership mechanism already used by the Moon expansion's
 * Hostile Takeover (and corporateBetterments' Joint Venture) for co-owned tiles.
 */
export class BattleOfZadonga extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.BATTLE_OF_ZADONGA,
      tags: [],
      cost: 25,

      metadata: {
        cardNumber: 'H20',
        renderData: CardRenderer.builder((b) => {
          b.city({all}).asterix();
        }),
        description: 'Place your player marker on a city an opponent owns. Both players own that ' +
          'city for scoring purposes and effects.',
      },
    });
  }

  private availableCities(player: IPlayer) {
    const marsCities = player.game.board.getCities();
    const venusCities = VenusPhase2Expansion.ifVenusPhase2(player.game, (data) => data.venusSurface.spaces.filter(Board.isCitySpace)) ?? [];
    return [...marsCities, ...venusCities].filter((space) =>
      space.player !== undefined && space.player.id !== player.id && space.coOwner === undefined);
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.availableCities(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const cities = this.availableCities(player);
    return new SelectSpace('Select a city to co-own', cities).andThen((space) => {
      space.coOwner = player;
      player.game.log('${0} now co-owns the city at ${1}', (b) => b.player(player).space(space));
      return undefined;
    });
  }
}
