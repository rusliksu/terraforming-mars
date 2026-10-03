import {MAX_FLEET_SIZE} from '../../common/constants';
import {CardName} from '../../common/cards/CardName';
import {ColoniesHandler} from '../colonies/ColoniesHandler';
import {AndOptions} from '../inputs/AndOptions';
import {CanAffordOptions, IPlayer} from '../IPlayer';
import {ENERGY_TRADE_COST, MC_TRADE_COST, TITANIUM_TRADE_COST} from '../../common/constants';
import {IColony} from '../colonies/IColony';
import {SelectPaymentDeferred} from '../deferredActions/SelectPaymentDeferred';
import {Resource} from '../../common/Resource';
import {TradeWithTitanFloatingLaunchPad} from '../cards/colonies/TitanFloatingLaunchPad';
import {OrOptions} from '../inputs/OrOptions';
import {SelectOption} from '../inputs/SelectOption';
import {SelectColony} from '../inputs/SelectColony';
import {IColonyTrader} from '../colonies/IColonyTrader';
import {TradeWithCollegiumCopernicus} from '../cards/pathfinders/CollegiumCopernicus';
import {message} from '../logs/MessageBuilder';
import {TradeWithDarksideSmugglersUnion} from '../cards/moon/DarksideSmugglersUnion';
import {Payment} from '../../common/inputs/Payment';
import {toLogPayment} from '../logs/toLogPayment';
import {TradeWithHectateSpeditions} from '../cards/underworld/HecateSpeditions';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {ColonyTradeContextModel} from '@/common/models/ColonyTradeContextModel';
import {ColonyBenefit} from '@/common/colonies/ColonyBenefit';

export class Colonies {
  private player: IPlayer;

  /** The number of trade fleets assigned to this player. */
  private fleetSize: number = 1;
  /** The number of consumed trade fleets. When this == `fleetSize` the player has no trade fleets. */
  public usedTradeFleets: number = 0;
  // When trading you may increase the Colony track this many steps.
  public tradeOffset: number = 0;

  // When trading you many use this many fewer resources of the trading type.
  public tradeDiscount: number = 0;

  public victoryPoints: number = 0; // Titania Colony VP
  public cardDiscount: number = 0; // Iapetus Colony

  constructor(player: IPlayer) {
    this.player = player;
  }

  /**
   * Returns `true` if this player can execute a trade.
   */
  public canTrade() {
    return ColoniesHandler.tradeableColonies(this.player.game).length > 0 &&
      this.getFleetSize() > this.usedTradeFleets &&
      this.player.game.tradeEmbargo !== true;
  }

  public coloniesTradeAction(): AndOptions | undefined {
    const game = this.player.game;
    if (game.gameOptions.coloniesExtension && this.canTrade()) {
      return this.tradeWithColony(ColoniesHandler.tradeableColonies(game));
    }
    return undefined;
  }

  private getTradeHandlers(): Array<IColonyTrader> {
    const player = this.player;
    return [
      new TradeWithDarksideSmugglersUnion(player),
      new TradeWithTitanFloatingLaunchPad(player),
      new TradeWithCollegiumCopernicus(player),
      new TradeWithHectateSpeditions(player),
      new TradeWithEnergy(player),
      new TradeWithTitanium(player),
      new TradeWithMegacredits(player),
    ];
  }

  /** Exposes current stock trade routes without spending resources or fleets. */
  public getTradeContext(): ColonyTradeContextModel {
    const player = this.player;
    const game = player.game;
    const handlers = this.getTradeHandlers();
    let additionalPaymentAvailable = false;
    const payments: Array<ColonyTradeContextModel['payments'][number]> = [];
    for (const handler of handlers) {
      if (handler instanceof TradeWithEnergy || handler instanceof TradeWithTitanium || handler instanceof TradeWithMegacredits) {
        const resource = handler instanceof TradeWithEnergy ? Resource.ENERGY :
          handler instanceof TradeWithTitanium ? Resource.TITANIUM : Resource.MEGACREDITS;
        const available = handler.canUse();
        const stockAvailable = player.stock[resource] >= handler.tradeCost;
        payments.push({resource, amount: handler.tradeCost, available: available && stockAvailable});
        if (available && !stockAvailable) {
          additionalPaymentAvailable = true;
        }
      } else if (handler.canUse()) {
        additionalPaymentAvailable = true;
      }
    }
    if (player.canUseHeatAsMegaCredits && player.heat > 0) {
      additionalPaymentAvailable = true;
    }

    const stockColonies: Array<ColonyTradeContextModel['stockColonies'][number]> = [];
    for (const colony of game.colonies) {
      const trade = colony.metadata.trade;
      const bonus = colony.metadata.colony;
      if (colony.isActive && trade.type === ColonyBenefit.GAIN_RESOURCES &&
          typeof trade.resource === 'string' && bonus.type === ColonyBenefit.GAIN_RESOURCES &&
          bonus.resource !== undefined && colony.metadata.shouldIncreaseTrack === 'yes') {
        stockColonies.push({
          name: colony.name,
          tradeResource: trade.resource,
          tradeAmounts: trade.quantity.slice(),
          ownBonus: {
            resource: bonus.resource,
            amount: bonus.quantity * colony.colonies.filter((owner) => owner === player.id).length,
          },
        });
      }
    }
    const raider = game.syndicatePirateRaider;
    const huanRaid = raider !== undefined && game.getPlayerById(raider).tableau.has(CardName.HUAN);
    const nextGenerationTradeAccess = raider === undefined || (raider === player.id && huanRaid) ? 'normal' :
      huanRaid ? 'blocked' : 'unknown';
    const passedPlayers = game.getPassedPlayers();
    return {
      version: 1,
      remainingActionsThisTurn: Math.max(0, player.availableActionsThisRound - player.actionsTakenThisRound),
      allOpponentsPassed: game.isSoloMode() || passedPlayers.length === game.players.length - 1 && !passedPlayers.includes(player.color),
      tradeAvailable: game.gameOptions.coloniesExtension && this.canTrade(),
      tradeOffset: this.tradeOffset,
      tradeBonusMC: this.getFixedTradeBonusMC(),
      payments,
      stockColonies,
      ordinaryProduction: !player.tableau.has(CardName.SUPERCAPACITORS) &&
        !player.tableau.some((card) => card.onProductionPhase !== undefined),
      additionalPaymentAvailable,
      nextGenerationTradeAccess,
      gameCanContinue: !game.gameIsOver(),
    };
  }

  /** Calculates the player's fixed cash reward after an ordinary trade. */
  public getFixedTradeBonusMC(): number {
    return this.player.tableau.has(CardName.VENUS_TRADE_HUB) ? 3 : 0;
  }

  private tradeWithColony(openColonies: Array<IColony>): AndOptions | undefined {
    const handlers = this.getTradeHandlers();

    let selected: IColonyTrader | undefined = undefined;

    const howToPayForTrade = new OrOptions()
      .setTitle('Pay trade fee')
      .setButtonLabel('Pay');
    handlers.forEach((handler) => {
      if (handler.canUse()) {
        howToPayForTrade.options.push(new SelectOption(
          handler.optionText()).andThen(() => {
          selected = handler;
          return undefined;
        }));
      }
    });

    if (howToPayForTrade.options.length === 0) {
      return undefined;
    }

    const selectColony = new SelectColony('Select colony tile for trade', 'trade', openColonies)
      .andThen((colony) => {
        if (selected === undefined) {
          throw new Error(`Unexpected condition: no trade funding source selected when trading with ${colony.name}.`);
        }
        selected.trade(colony);
        return undefined;
      });

    return new AndOptions(howToPayForTrade, selectColony)
      .setTitle('Trade with a colony tile')
      .setButtonLabel('Trade');
  }

  public getPlayableColonies(allowDuplicate: boolean = false, canAffordOptions: number | CanAffordOptions = 0) {
    const options: CanAffordOptions = typeof canAffordOptions === 'number' ? {cost: canAffordOptions} : canAffordOptions;

    return this.player.game.colonies
      .filter((colony) => {
        if (colony.isActive === false) {
          return false;
        }
        if (colony.isFull()) {
          return false;
        }
        if (!allowDuplicate && colony.colonies.includes(this.player.id)) {
          return false;
        }
        if (colony.name === ColonyName.VENUS && !this.player.canAfford({...options, tr: {venus: 1}})) {
          return false;
        }
        if (colony.name === ColonyName.EUROPA && !this.player.canAfford({...options, tr: {oceans: 1}})) {
          return false;
        }
        if (colony.name === ColonyName.LEAVITT) {
          const pharmacyUnion = this.player.tableau.get(CardName.PHARMACY_UNION);
          if ((pharmacyUnion?.resourceCount ?? 0) > 0 && !this.player.canAfford({...options, tr: {tr: 1}})) {
            return false;
          }
        }
        return true;
      });
  }

  public getVictoryPoints(): number {
    return this.player.colonies.victoryPoints;
  }

  public getFleetSize(): number {
    return this.fleetSize;
  }

  public increaseFleetSize(): void {
    if (this.fleetSize < MAX_FLEET_SIZE) {
      this.fleetSize++;
    }
  }

  public decreaseFleetSize(): void {
    // This fleet size management is a little tricky, because with The Moon, it's possible to
    // have more fleets than MAX_FLEET_SIZE which are then discarded.
    if (this.fleetSize > 0) {
      this.fleetSize--;
    }
  }

  public setFleetSize(fleetSize: number) {
    this.fleetSize = fleetSize;
  }

  public returnTradeFleets(): void {
    const syndicatePirateRaider = this.player.game.syndicatePirateRaider;
    // Syndicate Pirate Raids hook. If it is in effect, then only the syndicate pirate raider will
    // retrieve their fleets.
    // See Colony.ts for the other half of this effect, and Game.ts which disables it.
    if (syndicatePirateRaider === undefined) {
      this.usedTradeFleets = 0;
    } else if (syndicatePirateRaider === this.player.id) {
      // CEO effect: Disable all other players from trading next gen,
      // but free up all colonies (don't leave their trade fleets stuck there)
      if (this.player.tableau.has(CardName.HUAN)) {
        for (const player of this.player.opponents) {
          // Magic number high enough to disable other players' trading
          player.colonies.usedTradeFleets = 50;
        }
      }
      this.usedTradeFleets = 0;
    }
  }
}

export class TradeWithEnergy implements IColonyTrader {
  public readonly tradeCost: number;

  constructor(private player: IPlayer) {
    this.tradeCost = ENERGY_TRADE_COST - player.colonies.tradeDiscount;
  }

  public canUse() {
    return this.player.energy >= this.tradeCost;
  }
  public optionText() {
    return message('Pay ${0} energy', (b) => b.number(this.tradeCost));
  }

  public trade(colony: IColony) {
    this.player.stock.deduct(Resource.ENERGY, this.tradeCost);
    this.player.game.log('${0} spent ${1} energy to trade with ${2}', (b) => b.player(this.player).number(this.tradeCost).colony(colony),
      {payment: toLogPayment(Payment.EMPTY, this.tradeCost)});
    colony.trade(this.player);
  }
}

export class TradeWithTitanium implements IColonyTrader {
  public readonly tradeCost: number;

  constructor(private player: IPlayer) {
    this.tradeCost = TITANIUM_TRADE_COST - player.colonies.tradeDiscount;
  }

  public canUse() {
    return this.player.titanium >= this.tradeCost;
  }
  public optionText() {
    return message('Pay ${0} titanium', (b) => b.number(this.tradeCost));
  }

  public trade(colony: IColony) {
    const payment = Payment.of({titanium: this.tradeCost});
    this.player.pay(payment);
    this.player.game.log('${0} spent ${1} titanium to trade with ${2}', (b) => b.player(this.player).number(this.tradeCost).colony(colony),
      {payment: toLogPayment(payment)});
    colony.trade(this.player);
  }
}


export class TradeWithMegacredits implements IColonyTrader {
  public readonly tradeCost: number;

  constructor(private player: IPlayer) {
    this.tradeCost = MC_TRADE_COST- player.colonies.tradeDiscount;
    const adhai = player.tableau.get(CardName.ADHAI_HIGH_ORBIT_CONSTRUCTIONS);
    if (adhai !== undefined) {
      const adhaiDiscount = Math.floor(adhai.resourceCount / 2);
      this.tradeCost = Math.max(0, this.tradeCost - adhaiDiscount);
    }
  }

  public canUse() {
    return this.player.canAfford(this.tradeCost);
  }
  public optionText() {
    return message('Pay ${0} M€', (b) => b.number(this.tradeCost));
  }

  public trade(colony: IColony) {
    this.player.game.defer(new SelectPaymentDeferred(this.player, this.tradeCost,
      {title: message('Select how to pay ${0} for colony trade', (b) => b.number(this.tradeCost))}))
      .andThen((payment) => {
        this.player.game.log('${0} spent ${1} M€ to trade with ${2}', (b) => b.player(this.player).number(this.tradeCost).colony(colony),
          {payment: toLogPayment(payment)});
        colony.trade(this.player);
      });
  }
}
