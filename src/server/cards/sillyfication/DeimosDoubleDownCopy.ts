import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardMetadata} from '../../../common/cards/CardMetadata';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';
import {CardDiscount, AdditionalProjectCosts} from '../../../common/cards/Types';
import {CountableVictoryPoints} from '../../../common/cards/CountableVictoryPoints';
import {CardRequirementDescriptor} from '../../../common/cards/CardRequirementDescriptor';
import {OneOrArray} from '../../../common/utils/types';
import {Warning} from '../../../common/cards/Warning';
import {Behavior} from '../../behavior/Behavior';
import {IProjectCard} from '../IProjectCard';
import {IPlayer, CanAffordOptions} from '../../IPlayer';
import {GlobalParameter} from '../../../common/GlobalParameter';
import {PlayerInput} from '../../PlayerInput';
import {SerializedCard} from '../../SerializedCard';
import {newProjectCard} from '../../createCard';
import {Resource} from '../../../common/Resource';

const NO_WARNINGS: ReadonlySet<Warning> = new Set();

/**
 * A genuinely distinct playable copy of whichever Space event Deimos Double Down's owner
 * chose - CardName forbids two cards sharing a name in the same tableau (PlayedCards.push
 * throws), so the owner's own copy needs a different identity to actually be playable
 * alongside the original.
 *
 * This delegates everything (cost/tags/requirements/behavior/canPlay/play/etc) to a real
 * instance of the copied card, constructed lazily from `sourceCardName` - only `name` (and
 * the client-facing render, see ModelUtils.ts) differ. Verified safe for every Space-tagged
 * event card in the game (the only things Deimos Double Down ever copies): none of them
 * hold their own resources, implement onCardPlayed, or need custom serialization, so a thin
 * delegate is enough - the handful with bespoke play logic (SolarStorm, ExportConvoy, etc.)
 * only touch player/game state, never their own card identity.
 *
 * `instantiate: false` in the manifest keeps this out of the normal deal-from-deck pool;
 * it's only ever constructed directly by DeimosDoubleDown. It's also excluded from the
 * compiled static client manifest (see export_card_rendering.ts) so the client renders the
 * real wrapped card's face instead of a generic placeholder (see ModelUtils.ts's
 * `customCard` handling).
 *
 * Known gap: `canPlay`/`canPlayPostRequirements` delegate straight to the wrapped source,
 * so the Think Tank/Aeron Genomics "pay a global-parameter shortfall with resources" path
 * (GlobalParameterRequirement.satisfies) would set additionalProjectCosts on the source
 * instance, not this one, if a copied event ever had an unmet global-parameter requirement
 * - none of the 42 real Space events do today, but a future one that does wouldn't show the
 * discount breakdown correctly through a copy.
 */
export class DeimosDoubleDownCopy implements IProjectCard {
  public readonly name = CardName.DEIMOS_DOUBLE_DOWN_COPY;
  public sourceCardName: CardName;
  public resourceCount = 0;
  public warnings: ReadonlySet<Warning> = NO_WARNINGS;
  // Ephemeral, per-instance, and reset/set unconditionally by Player.getPlayableCards/
  // canPlay for every card in hand on every check - must be a real mutable field, not a
  // delegating getter (that threw "which only has a getter" the moment this card was ever
  // actually checked for playability).
  public additionalProjectCosts: AdditionalProjectCosts | undefined = undefined;

  private cachedSource: IProjectCard | undefined;

  constructor(sourceCardName: CardName = CardName.COMET) {
    this.sourceCardName = sourceCardName;
  }

  private get source(): IProjectCard {
    if (this.cachedSource === undefined || this.cachedSource.name !== this.sourceCardName) {
      const source = newProjectCard(this.sourceCardName);
      if (source === undefined) {
        throw new Error(`DeimosDoubleDownCopy: ${this.sourceCardName} is not a project card`);
      }
      this.cachedSource = source;
    }
    return this.cachedSource;
  }

  public get tags(): ReadonlyArray<Tag> {
    return this.source.tags;
  }
  public get cost(): number {
    return this.source.cost ?? 0;
  }
  public get type(): CardType {
    return this.source.type;
  }
  public get requirements(): ReadonlyArray<CardRequirementDescriptor> {
    return this.source.requirements;
  }
  public get metadata(): CardMetadata {
    return this.source.metadata;
  }
  public get behavior(): Behavior | undefined {
    return this.source.behavior;
  }
  public get actionBehavior(): Behavior | undefined {
    return this.source.actionBehavior;
  }
  public get victoryPoints(): number | 'special' | CountableVictoryPoints | undefined {
    return this.source.victoryPoints;
  }
  public get resourceType(): CardResource | undefined {
    return this.source.resourceType;
  }
  public get cardDiscount(): OneOrArray<CardDiscount> | undefined {
    return this.source.cardDiscount;
  }
  public get tilesBuilt(): ReadonlyArray<never> {
    return [];
  }
  public get bonusResource(): Array<Resource> | undefined {
    return this.source.bonusResource;
  }

  public addWarning(warning: Warning): void {
    if (this.warnings === NO_WARNINGS) {
      this.warnings = new Set();
    }
    (this.warnings as Set<Warning>).add(warning);
  }
  public clearWarnings(): void {
    this.warnings = NO_WARNINGS;
  }

  public getCardDiscount(player: IPlayer, card: IProjectCard): number {
    return this.source.getCardDiscount?.(player, card) ?? 0;
  }

  public canPlay(player: IPlayer, canAffordOptions?: CanAffordOptions): boolean {
    return this.source.canPlay(player, canAffordOptions);
  }
  public canPlayPostRequirements(player: IPlayer, canAffordOptions?: CanAffordOptions): boolean {
    return this.source.canPlayPostRequirements(player, canAffordOptions);
  }
  public play(player: IPlayer): PlayerInput | undefined {
    return this.source.play(player);
  }
  public getVictoryPoints(player: IPlayer): number {
    return this.source.getVictoryPoints(player);
  }
  public getGlobalParameterRequirementBonus(player: IPlayer, parameter: GlobalParameter): number {
    return this.source.getGlobalParameterRequirementBonus(player, parameter);
  }
  public getTagCardRequirementBonus(player: IPlayer, tag: Tag): number {
    return this.source.getTagCardRequirementBonus(player, tag);
  }

  public serialize(serialized: SerializedCard): void {
    serialized.data = {sourceCardName: this.sourceCardName};
  }
  public deserialize(serialized: SerializedCard): void {
    const data = serialized.data as {sourceCardName?: CardName} | undefined;
    if (data?.sourceCardName !== undefined) {
      this.sourceCardName = data.sourceCardName;
    }
  }
}
