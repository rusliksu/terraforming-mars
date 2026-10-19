// Common code for SelectPayment and SelectProjectCardToPlay
import {defineComponent} from 'vue';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {CardModel} from '@/common/models/CardModel';
import {SelectPaymentModel, SelectProjectCardToPlayModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {Units} from '@/common/Units';
import {CardResource} from '@/common/CardResource';
import {getCard} from '@/client/cards/ClientCardManifest';
import {DEFAULT_PAYMENT_VALUES, Payment} from '@/common/inputs/Payment';
import {SpendableResource} from '@/common/inputs/Spendable';
import {Ledger, newDefaultLedger} from '../components/PaymentLedger';
import {ALL_RESOURCES} from '@/common/Resource';

export type DataModel = {
  cost: number,
  payment: Payment,
  card: CardModel | undefined,
  available: Units | undefined,
};

export const PaymentWidgetMixin = defineComponent({
  // Props are intentionally re-declared by consumers (SelectPayment, SelectProjectCardToPlay)
  // to narrow playerinput's type. Component declarations override mixin declarations in Vue's
  // merge, so this broad union is only used within the mixin's own methods.
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectPaymentModel | SelectProjectCardToPlayModel,
      required: true,
    },
  },
  data(): DataModel {
    return {
      // payment and cost are shared by both consumers.
      cost: 0,
      payment: {...Payment.EMPTY},
      // card and available are undefined here; SelectProjectCardToPlay overrides both in its
      // own data(). SelectPayment never sets them — getAvailableUnits takes the fallback
      // path when available is undefined, and card is only accessed with optional chaining.
      card: undefined,
      available: undefined,
    };
  },
  methods: {
    buildLedger(
      order: ReadonlyArray<SpendableResource>,
      reserveUnits: Units,
    ): Ledger {
      const ledger = newDefaultLedger();

      function isStandardResource(x: any): x is keyof Units {
        return ALL_RESOURCES.includes(x);
      }

      const available = this.getAvailableUnits();
      for (const unit of order) {
        ledger[unit] = {
          available: available[unit],
          rate: this.getResourceRate(unit),
          reserved: isStandardResource(unit) ? reserveUnits[unit] > 0 : false,
        };
      }
      return ledger;
    },

    getResourceRate(unit: SpendableResource): number {
      switch (unit) {
      case 'steel':
        return this.getSteelResourceRate();
      case 'titanium':
        return this.getTitaniumResourceRate();
      default:
        return DEFAULT_PAYMENT_VALUES[unit];
      }
    },
    getSteelResourceRate(): number {
      const baseValue = this.playerView.thisPlayer.steelValue;
      return this.hasBlockhouseSteelBonus() ? baseValue + 2 : baseValue;
    },
    // Blockhouse: steel is worth 2 M€ extra when paying for a City-tagged card or the
    // City standard project (which carries no Tag.CITY of its own, so it's checked by name).
    hasBlockhouseSteelBonus(): boolean {
      if (this.card === undefined) {
        return false;
      }
      if (!this.playerView.thisPlayer.tableau.some((c) => c.name === CardName.BLOCKHOUSE)) {
        return false;
      }
      if (this.card.name === CardName.CITY_STANDARD_PROJECT) {
        return true;
      }
      return getCard(this.card.name)?.tags.includes(Tag.CITY) === true;
    },
    getTitaniumResourceRate(): number {
      const paymentOptions = this.playerinput.paymentOptions;
      const titaniumValue = this.playerView.thisPlayer.titaniumValue;
      if (paymentOptions?.titanium !== true &&
        paymentOptions?.lunaTradeFederationTitanium === true) {
        return titaniumValue - 1;
      }
      return titaniumValue;
    },
    getAvailableUnits(): Record<SpendableResource, number> {
      const thisPlayer = this.playerView.thisPlayer;
      const units: Record<SpendableResource, number> = {
        megacredits: thisPlayer.megacredits,
        heat: this.available ? this.available.heat : this.availableHeat(),
        energy: this.available ? this.available.energy : thisPlayer.energy,
        steel: this.available ? this.available.steel : thisPlayer.steel,
        titanium: this.available ? this.available.titanium : thisPlayer.titanium,
        plants: this.available ? this.available.plants : thisPlayer.plants,
        microbes: this.playerinput.microbes,
        floaters: this.playerinput.floaters,
        lunaArchivesScience: this.playerinput.type === 'projectCard' ? this.playerinput.lunaArchivesScience : 0,
        spireScience: this.playerinput.spireScience,
        seeds: this.playerinput.seeds,
        auroraiData: this.playerinput.auroraiData,
        graphene: this.playerinput.graphene,
        kuiperAsteroids: this.playerinput.kuiperAsteroids,
        nereidMicrobes: this.playerinput.type === 'projectCard' ? this.playerinput.nereidMicrobes : 0,
        anyFloaters: this.playerinput.type === 'projectCard' ? this.playerinput.anyFloaters : 0,
      };

      // Stratospheric Birds requires discarding one floater from any card.
      // That the card being paid for by the client shows that there's already a spare floater around, and
      // that the server has decided there's enough money to play it.
      //
      // The only floaters that can be used for payment are those on Dirigibles.
      // If you don't have Dirigibles but are still paying for S. Birds,
      // then amount, below would be -1, so the Math.max makes sure it's zero.

      // BTW, this could be managed by some derivative of reserveUnits that took extended resources into account.
      if (this.card?.name === CardName.STRATOSPHERIC_BIRDS) {
        // Find a card other than Dirigibles with floaters.
        // If there is none, then Dirigibles can't use every one.
        if (!thisPlayer.tableau.some((card) => {
          return card.name !== CardName.DIRIGIBLES && getCard(card.name)?.resourceType === CardResource.FLOATER && (card.resources ?? 0) > 0;
        })) {
          units.floaters = Math.max(units.floaters - 1, 0);
        }
      }
      // Soil Enrichment requires discarding one microbe from any card.
      // That the card being paid for by the client shows that there's already a spare microbe around, and
      // that the server has decided there's enough money to play it.
      //
      // The only microbes that can be used for payment are those on Psychopriles.
      // If you don't have Psychopriles but are still paying for Soil Enrichment,
      // then amount, below would be -1, so the Math.max makes sure it's zero.

      // BTW, this could be managed by some derivative of reserveUnits that took extended resources into account.
      if (this.card?.name === CardName.SOIL_ENRICHMENT) {
        // Find a card other than Psychopriles with microbes.
        // If there is none, then Psychopriles can't use every one.
        if (!thisPlayer.tableau.some((card) => {
          return card.name !== CardName.PSYCHROPHILES && getCard(card.name)?.resourceType === CardResource.MICROBE && (card.resources ?? 0) > 0;
        })) {
          units.microbes = Math.max(units.microbes - 1, 0);
        }
      }
      return units;
    },
    availableHeat(): number {
      const thisPlayer = this.playerView.thisPlayer;
      const stormcraft = thisPlayer.tableau.find((card) => card.name === CardName.STORMCRAFT_INCORPORATED);
      let heat = thisPlayer.heat + (stormcraft?.resources !== undefined ? stormcraft.resources * 2 : 0);
      // Sistemas Seebeck: energy and heat are one pool, so energy can cover a heat payment
      // (Merger'd Helion, or anything else that lets heat be spent as M€) too.
      if (thisPlayer.tableau.some((card) => card.name === CardName.SISTEMAS_SEEBECK)) {
        heat += thisPlayer.energy;
      }
      return heat;
    },
  },
});
