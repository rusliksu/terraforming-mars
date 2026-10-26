import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {all} from '../Options';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {Board} from '../../boards/Board';

export class Pothole extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.POTHOLE,
      cost: 2,

      metadata: {
        cardNumber: 'X17',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().megacredits(1, {all})).asterix();
        }),
        description: 'Choose a player with a city tile. That player loses 1 M€ production.',
      },
    });
  }

  private cityOwners(player: IPlayer): Array<IPlayer> {
    const marsCities = player.game.board.getCities();
    const venusCities = VenusPhase2Expansion.ifVenusPhase2(player.game, (data) => data.venusSurface.spaces.filter(Board.isCitySpace)) ?? [];
    const owners = [...marsCities, ...venusCities]
      .map((space) => space.player?.id)
      .filter((id) => id !== undefined);
    return player.game.players.filter((p) => owners.includes(p.id));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.cityOwners(player).some((p) => p.canHaveProductionReduced(Resource.MEGACREDITS, 1, player));
  }

  public override bespokePlay(player: IPlayer) {
    const targets = this.cityOwners(player)
      .filter((p) => p.canHaveProductionReduced(Resource.MEGACREDITS, 1, player));
    if (targets.length === 0) {
      return undefined;
    }
    if (targets.length === 1) {
      targets[0].production.add(Resource.MEGACREDITS, -1, {log: true, from: {player}});
      return undefined;
    }
    return new SelectPlayer(targets, 'Select a player with a city to decrease M€ production 1 step', 'Select')
      .andThen((target) => {
        target.production.add(Resource.MEGACREDITS, -1, {log: true, from: {player}});
        return undefined;
      });
  }
}
