import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Resource} from '../../../common/Resource';
import {IActionCard} from '../ICard';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectColony} from '../../inputs/SelectColony';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';
import {IColony} from '../../colonies/IColony';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Trade Agreements (Solaris, fan): the printed tag icon is an unusual sunburst that doesn't map
 * cleanly to an existing tag. Space was chosen as the best-effort fit (trade/colonies theme).
 */
export class TradeAgreements extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      cost: 17,
      tags: [Tag.SPACE],
      name: CardName.TRADE_AGREEMENTS,
      type: CardType.ACTIVE,

      requirements: {party: PartyName.UNITY},
      victoryPoints: {colonies: {colonies: {}}},

      metadata: {
        cardNumber: 'SOL27',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 Steel OR 2 Plants to trade with a Colony.', (eb) => {
            eb.steel(2).slash().plants(2).startAction.trade();
          });
        }),
        description: 'Requires that Unity is ruling or that you have 2 delegates there. ' +
          'Action: Spend 2 Steel or 2 Plants to trade with a Colony. 1 VP for each Colony you own.',
      },
    });
  }

  private payAndTrade(player: IPlayer, resource: typeof Resource.STEEL | typeof Resource.PLANTS) {
    const game = player.game;
    player.defer(
      new SelectColony('Select colony tile to trade with', 'Select', ColoniesHandler.tradeableColonies(game))
        .andThen((colony: IColony) => {
          player.stock.deduct(resource, 2, {log: true, from: {card: this}});
          game.log('${0} spent 2 ${1} to trade with ${2}', (b) => b.player(player).string(resource).colony(colony));
          colony.trade(player);
          return undefined;
        }),
    );
  }

  public canAct(player: IPlayer): boolean {
    return player.colonies.canTrade() && (player.steel >= 2 || player.plants >= 2);
  }

  public action(player: IPlayer) {
    const canPaySteel = player.steel >= 2;
    const canPayPlants = player.plants >= 2;

    if (canPaySteel && canPayPlants) {
      return new OrOptions(
        new SelectOption('Pay 2 Steel', 'Pay Steel').andThen(() => {
          this.payAndTrade(player, Resource.STEEL);
          return undefined;
        }),
        new SelectOption('Pay 2 Plants', 'Pay Plants').andThen(() => {
          this.payAndTrade(player, Resource.PLANTS);
          return undefined;
        }),
      );
    }

    this.payAndTrade(player, canPaySteel ? Resource.STEEL : Resource.PLANTS);
    return undefined;
  }
}
