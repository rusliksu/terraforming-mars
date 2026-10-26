import {CardType} from './CardType';
import {Tag} from './Tag';
import {Expansion} from './GameModule';
import {CardRequirementDescriptor} from './CardRequirementDescriptor';
import {CardResource} from '../CardResource';
import {ICardRenderRoot} from './render/Types';

/**
 * A user-authored playable card. Produced by the Card Maker, serialized into a share code by
 * `customCardCodec`, and stored (decoded) as `CustomCardLibraryEntry.definition` until approved,
 * at which point it's added to `CustomCardRegistry` and becomes a real, playable `DataDrivenCard`.
 */
export const MAX_CUSTOM_CARD_NAME_LENGTH = 40;
export const MAX_CUSTOM_CARD_DESCRIPTION_LENGTH = 400;
export const MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH = 400;
export const MAX_CUSTOM_CARD_TAGS = 4;
export const MAX_CUSTOM_CARD_REQUIREMENTS = 3;
export const MAX_CUSTOM_CARD_RENDER_ROWS = 4;
export const MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW = 8;
export const MIN_CUSTOM_CARD_COST = 0;
export const MAX_CUSTOM_CARD_COST = 50;

/** v1 scope: no corporations, preludes, CEOs, or standard projects. */
export type CustomCardType = CardType.AUTOMATED | CardType.ACTIVE | CardType.EVENT;

export const CUSTOM_CARD_TYPES: ReadonlyArray<CustomCardType> = [CardType.AUTOMATED, CardType.ACTIVE, CardType.EVENT];

/**
 * A card's effect. Deliberately typed as `unknown` here rather than importing the real
 * `Behavior` type (`src/server/behavior/Behavior.ts`) -- that file lives under `src/server/` and
 * pulls in server-only type dependencies (`PlacementType`, `AdjacencyBonus`), which `src/common/`
 * must never depend on (see CLAUDE.md). This value crosses an untrusted network boundary either
 * way, so it's validated at runtime, not by the type system:
 * - A public submission's `behavior` must satisfy `isCuratedBehavior()` (curatedBehaviorTemplates.ts)
 *   before the server will ever store or execute it.
 * - An admin's `set-behavior` override may be any value `validateBehavior`/the real `Behavior`
 *   type accepts (server-only route code casts it there).
 * The client's curated effect picker builds its own locally-typed shapes
 * (`src/client/components/cardmaker/curatedBehaviorTemplates.ts`) before ever crossing the wire.
 */
export type UncheckedBehavior = Record<string, unknown>;

export interface CustomCardDefinition {
  cardName: string;
  type: CustomCardType;
  tags: Array<Tag>;
  /** Which real expansions this card is compatible with -- gates whether a game's "Custom Cards" pool includes it. */
  compatibility: Array<Expansion>;
  cost: number;
  /** Static VP only in v1 -- no per-tag/dynamic victory points. */
  victoryPoints?: number;
  requirements: Array<CardRequirementDescriptor>;
  description: string;
  /** Set for an ACTIVE card that stores a resource on itself (pairs with an `addResources` effect). */
  resourceType?: CardResource;
  behavior?: UncheckedBehavior;
  /** Free text. A card with no `behavior` and no `effectDescription` is not a valid submission. */
  effectDescription?: string;
  renderData: ICardRenderRoot;
}

export function blankCustomCard(cardName: string): CustomCardDefinition {
  return {
    cardName,
    type: CardType.AUTOMATED,
    tags: [],
    compatibility: [],
    cost: 0,
    requirements: [],
    description: '',
    renderData: {is: 'root', rows: []},
  };
}
