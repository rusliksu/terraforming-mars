import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

export class FlyingGarden extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.FLYING_GARDEN,
      tags: [Tag.BUILDING],
      cost: 20,
      victoryPoints: 2,

      requirements: {party: PartyName.SPOME},

      behavior: {
        production: {energy: -1, plants: 1},
      },

      metadata: {
        cardNumber: '126',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().energy(1).br;
            pb.plus().plants(1);
          }).br;
          b.greenery({withO2: false}).asterix();
        }),
        description: 'Requires that Spome are ruling or that you have 2 delegates there, and that an off-world ' +
          'city tile exists. Place a greenery tile (do not raise oxygen). ' +
          'Decrease your energy production 1 step and increase your plant production 1 step.',
      },
    });
  }

  private hasOffWorldCity(player: IPlayer): boolean {
    return player.game.board.getCitiesOffMars().length > 0 || VenusPhase2Expansion.getCitiesCount(player.game) > 0;
  }

  // Judgment call: the printed card says "adjacent to an off-world city", but off-world city
  // spaces (SpaceType.COLONY) are deliberately excluded from this engine's adjacency graph
  // (see Board.computeAdjacentSpaces), so no space is ever adjacent to one -- the literal
  // requirement can never be satisfied. Instead, an off-world city merely needs to exist (same
  // gating as ExportsFromAmalthea), and the greenery may be placed on any available land space.
  private getAvailableSpaces(player: IPlayer): ReadonlyArray<Space> {
    if (!this.hasOffWorldCity(player)) {
      return [];
    }
    return player.game.board.getAvailableSpacesOnLand(player);
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.getAvailableSpaces(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    return new SelectSpace('Select space for greenery tile', this.getAvailableSpaces(player))
      .andThen((space: Space) => {
        player.game.addGreenery(player, space, false);
        return undefined;
      });
  }
}
