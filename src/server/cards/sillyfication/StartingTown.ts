import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {MarsBoard} from '../../boards/MarsBoard';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';
import {LoseProduction} from '../../deferredActions/LoseProduction';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Units} from '../../../common/Units';

export class StartingTown extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.STARTING_TOWN,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 15,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'X81',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().energy(1).br;
            pb.plus().megacredits(3);
          }).nbsp.city().asterix();
        }),
        description: 'Requires that you have no city tiles in play. Decrease your energy production 1 step and increase your M€ production 3 steps. Place a city tile.',
      },
    });
  }

  public productionBox() {
    return Units.of({energy: -1, megacredits: 3});
  }

  public override bespokeCanPlay(player: IPlayer, canAffordOptions: CanAffordOptions): boolean {
    if (player.game.board.getCitiesOnMars(player).length > 0) {
      return false;
    }
    const available = player.game.board.getAvailableSpacesForCity(player, canAffordOptions);
    if (available.length === 0) {
      return false;
    }
    return MarsBoard.hasEnergyCoverage(player, available);
  }

  public override bespokePlay(player: IPlayer) {
    const spaces = MarsBoard.filterForEnergy(player, player.game.board.getAvailableSpacesForCity(player));
    player.game.defer(new PlaceCityTile(player, {spaces})).andThen(() => {
      player.production.add(Resource.MEGACREDITS, 3, {log: true});
      player.game.defer(new LoseProduction(player, Resource.ENERGY, {count: 1}));
      return undefined;
    });
    return undefined;
  }
}
