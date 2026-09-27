import {LawSuit} from '../cards/promo/LawSuit';
import {Resource} from '../../common/Resource';
import {From, isFromPlayer} from '../logs/From';
import {BaseStock} from './StockBase';
import {IPlayer} from '../IPlayer';
import {CardName} from '../../common/cards/CardName';
import {RebalanceSeebeckProductionLoss} from '../deferredActions/RebalanceSeebeckProductionLoss';
import {OrcTurbinesProductionSwap} from '../deferredActions/OrcTurbinesProductionSwap';
import {TurmoilHandler} from '../turmoil/TurmoilHandler';

export class Production extends BaseStock {
  constructor(player: IPlayer) {
    super(player, -5);
  }
  public add(
    resource: Resource,
    amount : number,
    options? : { log: boolean, from? : From, stealing?: boolean, skipSeebeckRedistribution?: boolean, skipOrcTurbinesSwap?: boolean},
  ) {
    // Sistemas Seebeck: energy and heat production are one pool for its owner - redirect a
    // reduction to either into a deferred choice of how to split it between the two,
    // instead of applying it to whichever one the caller specified.
    if (amount < 0 &&
      (resource === Resource.ENERGY || resource === Resource.HEAT) &&
      options?.skipSeebeckRedistribution !== true &&
      this.player.game !== undefined &&
      this.player.tableau.has(CardName.SISTEMAS_SEEBECK)) {
      this.player.game.defer(new RebalanceSeebeckProductionLoss(this.player, resource, -amount, options));
      return;
    }

    // Orc Turbines (Rob Antilles): "every time you decrease your Energy production, you can
    // decrease your Heat production by 2 instead" - offer the substitution instead of applying
    // the Energy loss directly.
    if (amount < 0 &&
      resource === Resource.ENERGY &&
      options?.skipOrcTurbinesSwap !== true &&
      this.player.game !== undefined &&
      this.player.tableau.has(CardName.ORC_TURBINES)) {
      this.player.game.defer(new OrcTurbinesProductionSwap(this.player, -amount, options));
      return;
    }

    const adj = resource === Resource.MEGACREDITS ? -5 : 0;
    const delta = (amount >= 0) ? amount : Math.max(amount, -(this[resource] - adj));
    this[resource] += delta;

    if (options?.log === true) {
      this.logUnitDelta(resource, delta, /* production*/ true, options.from, options.stealing);
    }

    const from = options?.from;
    if (isFromPlayer(from)) {
      LawSuit.resourceHook(this.player, delta, from.player);

      // Mons Insurance hook
      if (delta < 0 && from.player.id !== this.player.id) {
        this.player.resolveInsurance();
      }
    }

    for (const card of this.player.tableau) {
      card.onProductionGain?.(this.player, resource, amount);
    }

    // `this.player.game` may not be wired up yet in a few test-only construction paths.
    if (this.player.game !== undefined) {
      for (const cardOwner of this.player.game.playersInGenerationOrder) {
        for (const card of cardOwner.tableau) {
          card.onProductionGainByAnyPlayer?.(cardOwner, this.player, resource, amount);
        }
      }

      TurmoilHandler.applyOnProductionChangedEffect(this.player, resource, amount);
    }
  }
}
