import {Card} from './Card';
import {IProjectCard} from './IProjectCard';
import {CardName} from '../../common/cards/CardName';
import {Behavior} from '../behavior/Behavior';
import {CustomCardDefinition} from '../../common/cards/CustomCardDefinition';

/**
 * A generic, runtime-constructed card built from a `CustomCardDefinition` (the Card Maker's
 * output). No method overrides needed -- `Card`'s default `play()`/`canPlay()`/
 * `getVictoryPoints()` already run `behavior`/`requirements` generically for any card that sets
 * them declaratively, exactly like the simplest hand-authored cards (e.g. MineralDeposit,
 * DustSeals).
 *
 * `def.behavior` is validated (against the curated-template vocabulary for a public submission,
 * or via `validateBehavior` for an admin override) before it ever reaches this constructor -- see
 * ApiCustomCardLibrary.ts / ApiCustomCardLibraryReview.ts. It's cast to `Behavior` here because
 * `CustomCardDefinition` deliberately can't import that server-only type (see
 * CustomCardDefinition.ts's `UncheckedBehavior` doc comment).
 *
 * `def.cardName` is cast to `CardName` -- safe (see the Custom Card Maker plan): `CardName` is a
 * closed enum but nothing else in the codebase assumes it's exhaustively closed. The one real
 * hazard is `Card.ts`'s process-lifetime `cardProperties` cache, keyed by this name: two
 * `DataDrivenCard`s must never be constructed with the same `cardName` but a different
 * definition (the registry's boot/refresh logic is responsible for this invariant, not this
 * class).
 */
export class DataDrivenCard extends Card implements IProjectCard {
  constructor(def: CustomCardDefinition) {
    super({
      name: def.cardName as unknown as CardName,
      type: def.type,
      cost: def.cost,
      tags: def.tags,
      requirements: def.requirements,
      victoryPoints: def.victoryPoints,
      resourceType: def.resourceType,
      behavior: def.behavior as Behavior | undefined,
      metadata: {
        cardNumber: 'CC',
        renderData: def.renderData,
        description: def.description,
      },
    });
  }
}
