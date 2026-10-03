import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SelectColony} from '../../inputs/SelectColony';
import {IColony} from '../../colonies/IColony';
import {MAX_COLONIES_PER_TILE} from '../../../common/constants';

export class OvercrowdedColony extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.OVERCROWDED_COLONY,
      tags: [Tag.SPACE],
      cost: 8,
      victoryPoints: -2,

      metadata: {
        cardNumber: 'X50',
        renderData: CardRenderer.builder((b) => {
          b.colonies(1).asterix().trade();
        }),
        description: 'Requires a colony tile that already has 3 colonies. Add a colony to that tile, gaining the placement bonus, then trade with it for free.',
      },
    });
  }

  private fullColonies(player: IPlayer): Array<IColony> {
    return player.game.colonies.filter((colony) => colony.isActive && colony.colonies.length >= MAX_COLONIES_PER_TILE);
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    if (player.game.tradeEmbargo === true) {
      return false;
    }
    return this.fullColonies(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const colonies = this.fullColonies(player);
    return new SelectColony('Select a full colony tile to add a colony to', 'Add colony', colonies)
      .andThen((colony) => {
        const game = player.game;
        game.log('${0} crammed an extra colony onto ${1}', (b) => b.player(player).colony(colony));

        // The tile is already full (3 colonies). Momentarily treat it as having 2 so the
        // normal build path awards the placement bonus (build bonuses are identical for
        // every slot), then restore the displaced colony so the tile ends up with 4.
        const displaced = colony.colonies.pop();
        colony.addColony(player);
        if (displaced !== undefined) {
          colony.colonies.splice(colony.colonies.length - 1, 0, displaced);
        }
        if (colony.trackPosition < colony.colonies.length) {
          colony.trackPosition = colony.colonies.length;
        }

        player.defer(() => {
          colony.trade(player, {usesTradeFleet: false});
          return undefined;
        });
        return undefined;
      });
  }
}
