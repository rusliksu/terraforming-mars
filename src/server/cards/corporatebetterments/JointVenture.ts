import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';
import {all} from '../Options';

export class JointVenture extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.JOINT_VENTURE,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 16,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'B35',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().energy(1, {all})).br;
          b.city().asterix();
        }),
        description: 'Decrease an opponent\'s energy production 1 step. Place a city tile, adding that ' +
          'opponent\'s marker to it as a co-owner: the city belongs to both of you for effects and scoring.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getAvailableSpacesForType(player, 'city').length > 0;
  }

  private placeSharedCity(player: IPlayer, coOwner: IPlayer) {
    player.game.defer(new PlaceCityTile(player)).andThen((space) => {
      if (space !== undefined) {
        space.coOwner = coOwner;
        player.game.log('${0} and ${1} now co-own the city at ${2}', (b) => b.player(player).player(coOwner).space(space));
      }
      return undefined;
    });
  }

  private attackAndShare(player: IPlayer, target: IPlayer) {
    target.maybeBlockAttack(player, 'lose 1 energy production', (proceed) => {
      if (proceed) {
        target.production.add(Resource.ENERGY, -1, {log: true, from: {player}});
      }
      this.placeSharedCity(player, target);
      return undefined;
    });
  }

  public override bespokePlay(player: IPlayer) {
    const targets = player.game.players.filter((p) => p !== player && p.canHaveProductionReduced(Resource.ENERGY, 1, player));

    if (targets.length === 0) {
      // No opponent can lose energy production (e.g. solo mode). The city still gets built, just without a partner.
      player.game.defer(new PlaceCityTile(player));
      return undefined;
    }
    if (targets.length === 1) {
      this.attackAndShare(player, targets[0]);
      return undefined;
    }

    return new SelectPlayer(targets, 'Select a player to lose 1 energy production and co-own the new city')
      .andThen((target) => {
        this.attackAndShare(player, target);
        return undefined;
      });
  }
}
