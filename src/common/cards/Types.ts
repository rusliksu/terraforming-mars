import {GlobalParameter} from '../GlobalParameter';
import {Tag} from './Tag';

/**
 * Description of a discount for playing project tags.
 */
export type CardDiscount = {
  /** The tag this discount applies to, or when undefined, it applies to all cards. */
  tag?: Tag,
  /** The M€ discount. */
  amount: number,
  /** Describes whether the discount is applied once for the card, or for ever tag. */
  per?: 'card' | 'tag',
 }

/**
 * A type of global parameter requirement bonus.
 */
export type GlobalParameterRequirementBonus = {
  /** The size of the bonus. */
  steps: number,
  /** The global parameter it applies to */
  parameter?: GlobalParameter,
  /** This discount only applies to the next card played when this is true. */
  nextCardOnly?: boolean,
};

/**
 * A type of tag-count requirement bonus (e.g. Excavation Syria Planum).
 */
export type TagCardRequirementBonus = {
  /** The size of the bonus. */
  steps: number,
  /** The tag whose requirement count this reduces (or increases). */
  tag: Tag,
  /** This bonus only applies to the next card played when this is true. */
  nextCardOnly?: boolean,
};

/**
 * Describes which non-megacredit resources a standard project accepts as payment.
 */
export type StandardProjectCanPayWith = {
  steel?: boolean,
  titanium?: boolean,
  seeds?: boolean,
  kuiperAsteroids?: boolean,
  /** Floaters pulled from ANY of the player's cards, not one fixed card -- see Spendable.ts. */
  anyFloaters?: boolean,
}

/**
 * When defined, this indicates additional costs required to play a card.
 */
export type AdditionalProjectCosts = {
  /** Any resources that need to come off Think Tank to meet global requirements. */
  thinkTankResources?: number,
  /** Any resources that need to come off Aeron Genomics to meet global requirements. */
  aeronGenomicsResources?: number,
  /** Any predicted fees required to play this card because Reds are in power. */
  redsCost?: number,
  /** Conglomerates: this Team Action's actual current Coordination cost, which climbs by 1 every time this player uses it (not their teammate), resetting each generation -- shown since the card's own icon always shows its unescalated base cost. */
  conglomeratesCost?: number,
}
