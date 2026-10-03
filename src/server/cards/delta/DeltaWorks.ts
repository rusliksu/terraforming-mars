import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {IColony} from '../../colonies/IColony';
import {IColonyTrader} from '../../colonies/IColonyTrader';
import {Resource} from '../../../common/Resource';
import {ENERGY_TRADE_COST} from '../../../common/constants';
import {message} from '../../logs/MessageBuilder';

export class DeltaWorks extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.DELTA_WORKS,
      tags: [Tag.BUILDING],
      cost: 4,

      metadata: {
        cardNumber: 'DP05',
        renderData: CardRenderer.builder((b) => {
          b.effect('When doing the Delta Project action, or when you trade with a colony, you may use steel as energy.', (eb) => {
            eb.steel(1).startEffect.energy(1);
          });
        }),
      },
    });
  }

  // Delta Project half in DeltaProjectExpansion.availableEnergyForDelta / deductEnergyForDelta.
  // Colony-trade half in TradeWithSteel below, registered in Colonies.ts.
}

/** Delta Works: pay a colony's energy trade cost with steel instead, at the same rate. */
export class TradeWithSteel implements IColonyTrader {
  private tradeCost: number;

  constructor(private player: IPlayer) {
    this.tradeCost = ENERGY_TRADE_COST - player.colonies.tradeDiscount;
  }

  public canUse() {
    return this.player.tableau.has(CardName.DELTA_WORKS) && this.player.steel >= this.tradeCost;
  }

  public optionText() {
    return message('Pay ${0} steel', (b) => b.number(this.tradeCost));
  }

  public trade(colony: IColony) {
    this.player.stock.deduct(Resource.STEEL, this.tradeCost);
    this.player.game.log('${0} spent ${1} steel to trade with ${2}', (b) => b.player(this.player).number(this.tradeCost).colony(colony));
    colony.trade(this.player);
  }
}
