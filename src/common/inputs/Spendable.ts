import {CardName} from '../cards/CardName';

/**
 * Standard resources that can be spent as M€
 */
export const SPENDABLE_STANDARD_RESOURCES = [
  // Standard currency for paying for stuff
  'megacredits',
  // Helion corporation can spend heat as M€.
  'heat',
  // Turmoil More Parties: Empower Policy 1 lets energy be spent as M€ (2 M€ per energy)
  // while that policy is in effect.
  'energy',
  // Used for cards with building tags
  'steel',
  // Used for cards with space tags, and as the Luna Trade Federation
  'titanium',
  // Martian Lumber Corp lets players pay for building tags with plants.
  'plants',
  // Venus Phase 2's own standard projects (Cloud City/Gas Mine/Floater Array) let a player spend
  // floaters pulled from ANY of their played cards, not one fixed card -- unlike every card
  // resource below, which is hardcoded to exactly one CardName via CARD_FOR_SPENDABLE_RESOURCE.
  // Lives here (not SPENDABLE_CARD_RESOURCES) for the same reason heat/energy do: its available
  // amount and its deduction both need bespoke handling (Player.maxSpendable/pay) instead of the
  // generic one-card lookup.
  'anyFloaters',
] as const;

/**
 * Card resources that can be converted to M€
 */
export const SPENDABLE_CARD_RESOURCES = [
  // Psychrophiles corporation can spend its floaters for cards with plant tags.
  'microbes',
  // Dirigibles corporation can spend its floaters for cards with Venus tags.
  'floaters',
  // Luna Archives corporation can spend its science resources for cards with Moon tags.
  'lunaArchivesScience',
  // Spire corporation can spend its science resources on standrad projects.
  'spireScience',
  // TODO(kberg): add test for Soylent Seedling Systems + Psychophiles.
  // Soylent Seedling Systems corporation can use its seeds to pay for cards with plant tags, or the standard greenery project.
  'seeds',
  // Aurorai corporation can use its data to pay for standard projects.
  'auroraiData',
  // Graphene is a Carbon Nanosystems resource that pays for city and space projects.
  'graphene',
  // Asteroids is a Kuiper Cooperative resource that pays for aquifer and asteroid standard projects.
  'kuiperAsteroids',
  // Nereid Biosystems corporation can spend its microbes for cards with a Jovian tag.
  'nereidMicrobes',
] as const;

export const SPENDABLE_RESOURCES = [...SPENDABLE_STANDARD_RESOURCES, ...SPENDABLE_CARD_RESOURCES] as const;

export type SpendableStandardResource = typeof SPENDABLE_STANDARD_RESOURCES[number];
/** Types of resources on cards that can be spent to pay for things. */
export type SpendableCardResource = typeof SPENDABLE_CARD_RESOURCES[number];

/** Types of resources spent to pay for things. */
export type SpendableResource = SpendableStandardResource | SpendableCardResource;

export const CARD_FOR_SPENDABLE_RESOURCE = {
  microbes: CardName.PSYCHROPHILES,
  floaters: CardName.DIRIGIBLES,
  lunaArchivesScience: CardName.LUNA_ARCHIVES,
  spireScience: CardName.SPIRE,
  seeds: CardName.SOYLENT_SEEDLING_SYSTEMS,
  auroraiData: CardName.AURORAI,
  graphene: CardName.CARBON_NANOSYSTEMS,
  kuiperAsteroids: CardName.KUIPER_COOPERATIVE,
  nereidMicrobes: CardName.NEREID_BIOSYSTEMS,
} satisfies Record<SpendableCardResource, CardName>;
