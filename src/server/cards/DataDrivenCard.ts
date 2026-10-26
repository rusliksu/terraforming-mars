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
 * Each instance pins its definition so library edits cannot change an active game.
 */
export class DataDrivenCard extends Card implements IProjectCard {
  public readonly definition: CustomCardDefinition;

  constructor(def: CustomCardDefinition) {
    def = structuredClone(def);
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
    }, false);
    this.definition = def;
  }
}
