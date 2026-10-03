import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';
import {DeltaProjectPlayerModel} from '../../common/models/DeltaProjectPlayerModel';
import {CardName} from '../../common/cards/CardName';
import {Tag} from '../../common/cards/Tag';
import {Resource} from '../../common/Resource';
import {SelectOption} from '../inputs/SelectOption';
import {SelectCard} from '../inputs/SelectCard';
import {OrOptions} from '../inputs/OrOptions';
import {VictoryPointsBreakdownBuilder} from '../game/VictoryPointsBreakdownBuilder';
import {DrawCards} from '../deferredActions/DrawCards';
import {AddResourcesToCard} from '../deferredActions/AddResourcesToCard';
import {CardResource} from '../../common/CardResource';
import {IActionCard, ICard, isIActionCard, isIHasCheckLoops} from '../cards/ICard';
import {PlayerInput} from '../PlayerInput';
import {DeltaProjectInput} from './DeltaProjectInput';

/**
 * The ordered tags for each track position (1-indexed).
 * Position 0 is the starting position (no tag).
 * Positions 10 and 11 are the 2VP and 5VP spots (no tag requirement).
 */
export const DELTA_TRACK_TAGS: ReadonlyArray<Tag | undefined> = [
  undefined,     // 0: start
  Tag.BUILDING,  // 1
  Tag.POWER,     // 2
  Tag.EARTH,     // 3
  Tag.SPACE,     // 4
  Tag.SCIENCE,   // 5
  Tag.PLANT,     // 6
  Tag.MICROBE,   // 7
  Tag.JOVIAN,    // 8
  Tag.ANIMAL,    // 9
  undefined,     // 10: 2VP
  undefined,     // 11: 5VP
] as const;

export const VP2_POSITION = 10;
export const VP5_POSITION = 11;

export const MAX_TRACK_POSITION = DELTA_TRACK_TAGS.length - 1; // 11 (positions 0–11)

/** Which marker on the Delta Project track is being referred to. Every player has a
 * `primary` marker (from the always-dealt Delta Project prelude); `epsilon` is the
 * second marker granted by the Epsilon Dample corporation. */
export type MarkerKind = 'primary' | 'epsilon';

export class DeltaProjectExpansion {
  private constructor() {}

  private static getProgress(player: IPlayer): DeltaProjectPlayerModel {
    return DeltaProjectExpansion.getMarkerData(player, 'primary');
  }

  private static getMarkerData(player: IPlayer, marker: MarkerKind): DeltaProjectPlayerModel {
    const data = marker === 'primary' ? player.deltaProjectData : player.epsilonDampleData;
    if (data === undefined) {
      throw new Error(`No ${marker} Delta Project progress for player ` + player.color);
    }
    return data;
  }

  // True if some marker other than (`excludePlayer`, `excludeMarker`) occupies this track
  // position - including the *other* marker belonging to `excludePlayer` themselves, so a
  // player can't stack both of their own markers on the same VP spot.
  private static isOccupiedByOther(game: IGame, position: number, excludePlayer: IPlayer, excludeMarker: MarkerKind): boolean {
    for (const p of game.players) {
      const isExcludedPlayer = p === excludePlayer;
      if (p.deltaProjectData?.position === position && !(isExcludedPlayer && excludeMarker === 'primary')) {
        return true;
      }
      if (p.epsilonDampleData?.position === position && !(isExcludedPlayer && excludeMarker === 'epsilon')) {
        return true;
      }
    }
    return false;
  }

  // Delta Works: steel can substitute for energy when paying for Delta Project movement.
  private static availableEnergyForDelta(player: IPlayer): number {
    return player.energy + (player.tableau.has(CardName.DELTA_WORKS) ? player.steel : 0);
  }

  private static deductEnergyForDelta(player: IPlayer, amount: number): void {
    if (player.tableau.has(CardName.DELTA_WORKS)) {
      const fromEnergy = Math.min(player.energy, amount);
      player.stock.deduct(Resource.ENERGY, fromEnergy);
      player.stock.deduct(Resource.STEEL, amount - fromEnergy);
    } else {
      player.stock.deduct(Resource.ENERGY, amount);
    }
  }

  // Notifies every player's tableau (Development Manager, Social Heating) that a marker moved.
  private static notifyMovement(player: IPlayer, steps: number, forward: boolean): void {
    for (const p of player.game.players) {
      for (const card of p.tableau) {
        card.onDeltaTrackMoved?.(p, player, steps, forward);
      }
    }
  }

  // Whether the player has enough tags (using wilds to fill gaps) to reach targetPos.
  private static canReachPosition(player: IPlayer, targetPos: number): boolean {
    let missing = 0;
    for (let pos = 1; pos <= Math.min(targetPos, 9); pos++) {
      const tag = DELTA_TRACK_TAGS[pos];
      if (tag !== undefined && player.tags.count(tag, 'raw') === 0) {
        missing++;
      }
    }
    return missing <= player.tags.count(Tag.WILD, 'raw');
  }

  /**
   * Returns the allowed values for `advance(player, steps)` from the current position: each array
   * element is one legal `steps` argument (energy spent equals steps; landing passes tag checks and VP occupancy).
   * For example `[1, 2, 3]` when several jump sizes work, or `[2]` when only a two-step jump ends on a legal space.
   * Returns an empty array when no advance is possible.
   */
  public static getValidAdvanceSteps(player: IPlayer): ReadonlyArray<number> {
    return DeltaProjectExpansion.computeValidAdvanceSteps(player, 'primary');
  }

  /** Same as {@link getValidAdvanceSteps}, but for Epsilon Dample's second marker. */
  public static getValidEpsilonAdvanceSteps(player: IPlayer): ReadonlyArray<number> {
    return DeltaProjectExpansion.computeValidAdvanceSteps(player, 'epsilon');
  }

  private static computeValidAdvanceSteps(player: IPlayer, marker: MarkerKind): ReadonlyArray<number> {
    const game = player.game;
    const progress = DeltaProjectExpansion.getMarkerData(player, marker);
    const currentPos = progress.position;

    // Little Dutch Boy: this marker was blocked for the rest of the generation.
    if (progress.blocked === true) {
      return [];
    }

    // Epsilon Dample's marker locks in place once it reaches a VP spot - the primary
    // marker has no such restriction and can still advance from 2VP to 5VP.
    if (marker === 'epsilon' && (currentPos === VP2_POSITION || currentPos === VP5_POSITION)) {
      return [];
    }

    if (currentPos >= MAX_TRACK_POSITION) {
      return [];
    }

    const result: number[] = [];
    const maxByEnergy = Math.min(DeltaProjectExpansion.availableEnergyForDelta(player), MAX_TRACK_POSITION - currentPos);

    for (let steps = 1; steps <= maxByEnergy; steps++) {
      const newPos = currentPos + steps;
      if (newPos > MAX_TRACK_POSITION) {
        break;
      }

      if (!DeltaProjectExpansion.canReachPosition(player, newPos)) {
        continue;
      }

      if ((newPos === VP2_POSITION || newPos === VP5_POSITION) &&
        DeltaProjectExpansion.isOccupiedByOther(game, newPos, player, marker)) {
        continue;
      }
      result.push(steps);
    }
    return result;
  }

  /**
   * Returns the allowed values for `retreatEpsilon(player, steps)`: how far Epsilon
   * Dample's second marker can move backward. Unlike advancing, retreating has no tag
   * requirement. Every landing re-triggers that position's reward - see {@link resolveReward}.
   */
  public static getValidEpsilonRetreatSteps(player: IPlayer): ReadonlyArray<number> {
    const game = player.game;
    const progress = DeltaProjectExpansion.getMarkerData(player, 'epsilon');
    if (progress.blocked === true) {
      return [];
    }
    // Locked in place once it reaches a VP spot - see computeValidAdvanceSteps.
    if (progress.position === VP2_POSITION || progress.position === VP5_POSITION) {
      return [];
    }
    const maxSteps = Math.min(DeltaProjectExpansion.availableEnergyForDelta(player), progress.position);

    const result: number[] = [];
    for (let steps = 1; steps <= maxSteps; steps++) {
      const newPos = progress.position - steps;
      if ((newPos === VP2_POSITION || newPos === VP5_POSITION) &&
        DeltaProjectExpansion.isOccupiedByOther(game, newPos, player, 'epsilon')) {
        continue;
      }
      result.push(steps);
    }
    return result;
  }

  /**
   * Highest legal step count. Not every integer 1..maxSteps is valid when VP
   * spaces are blocked (use {@link DeltaProjectExpansion.getValidAdvanceSteps} for the full list).
   * Returns 0 when no advance is possible.
   *
   * Constraints:
   * - Must have the required tag (raw, without wilds) for each step, OR use a wild tag.
   * - Each wild tag covers exactly one missing tag.
   * - Must have enough energy (1 per step).
   * - Cannot land on position VP spots if another player already occupies that position.
   * - Cannot move beyond position 11 (5VP).
   */
  public static maxSteps(player: IPlayer): number {
    const steps = DeltaProjectExpansion.getValidAdvanceSteps(player);
    return steps.length === 0 ? 0 : Math.max(...steps);
  }

  /** Same as {@link maxSteps}, but for Epsilon Dample's second marker. */
  public static maxEpsilonSteps(player: IPlayer): number {
    const steps = DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player);
    return steps.length === 0 ? 0 : Math.max(...steps);
  }

  public static advance(player: IPlayer, steps: number): void {
    const valid = DeltaProjectExpansion.getValidAdvanceSteps(player);
    if (!valid.includes(steps)) {
      throw new Error(`Invalid Delta Project advance: ${String(steps)} step(s) (valid: ${valid.join(', ')})`);
    }

    const progress = DeltaProjectExpansion.getProgress(player);
    const currentPos = progress.position;
    const newPos = currentPos + steps;

    DeltaProjectExpansion.deductEnergyForDelta(player, steps);
    progress.position = newPos;

    // Delta Surge: gain every step's reward when advancing multiple steps at once, not
    // just the landing position (resolveReward already no-ops for the VP-only positions).
    if (player.tableau.has(CardName.DELTA_SURGE)) {
      for (let pos = currentPos + 1; pos <= newPos; pos++) {
        DeltaProjectExpansion.resolveReward(player, pos, 'primary');
      }
    } else {
      DeltaProjectExpansion.resolveReward(player, newPos, 'primary');
    }
    DeltaProjectExpansion.notifyMovement(player, steps, true);

    player.game.log('${0} spend ${1} energy to advance on the Delta Project track', (b) => b.player(player).number(steps));
  }

  /** Builds the player input for using the Delta Project prelude action. */
  public static buildAdvanceInput(player: IPlayer): PlayerInput | undefined {
    return DeltaProjectExpansion.buildStepInput(player);
  }

  private static buildStepInput(player: IPlayer): PlayerInput | undefined {
    const validSteps = DeltaProjectExpansion.getValidAdvanceSteps(player);
    if (validSteps.length === 0) {
      return undefined;
    }
    return new DeltaProjectInput(validSteps).andThen((amount) => {
      DeltaProjectExpansion.advance(player, amount);
      return undefined;
    });
  }

  /** Advance Epsilon Dample's second marker. Grants the landing position's reward every
   * time - the point of this marker is that it can shuttle back and forth to re-farm a
   * reward repeatedly, as long as you keep paying the energy for it. */
  public static advanceEpsilon(player: IPlayer, steps: number): void {
    const valid = DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player);
    if (!valid.includes(steps)) {
      throw new Error(`Invalid Epsilon Dample advance: ${String(steps)} step(s) (valid: ${valid.join(', ')})`);
    }

    const progress = DeltaProjectExpansion.getMarkerData(player, 'epsilon');
    const currentPos = progress.position;
    const newPos = currentPos + steps;

    DeltaProjectExpansion.deductEnergyForDelta(player, steps);
    progress.position = newPos;

    if (player.tableau.has(CardName.DELTA_SURGE)) {
      for (let pos = currentPos + 1; pos <= newPos; pos++) {
        DeltaProjectExpansion.resolveReward(player, pos, 'epsilon');
      }
    } else {
      DeltaProjectExpansion.resolveReward(player, newPos, 'epsilon');
    }
    DeltaProjectExpansion.notifyMovement(player, steps, true);

    player.game.log('${0} spent ${1} energy to advance their second marker on the Delta Project track', (b) => b.player(player).number(steps));
  }

  /** Move Epsilon Dample's second marker backward. Costs 1 energy per step, same as
   * advancing, and also grants the landing position's reward every time - see
   * {@link advanceEpsilon}. */
  public static retreatEpsilon(player: IPlayer, steps: number): void {
    const valid = DeltaProjectExpansion.getValidEpsilonRetreatSteps(player);
    if (!valid.includes(steps)) {
      throw new Error(`Invalid Epsilon Dample retreat: ${String(steps)} step(s) (valid: ${valid.join(', ')})`);
    }

    const progress = DeltaProjectExpansion.getMarkerData(player, 'epsilon');
    const newPos = progress.position - steps;

    DeltaProjectExpansion.deductEnergyForDelta(player, steps);
    progress.position = newPos;
    DeltaProjectExpansion.resolveReward(player, newPos, 'epsilon');
    DeltaProjectExpansion.notifyMovement(player, steps, false);

    player.game.log('${0} spent ${1} energy to move their second marker backward on the Delta Project track', (b) => b.player(player).number(steps));
  }

  /**
   * Grants `position`'s landing reward outright, bypassing all the normal step/cost/tag
   * machinery. Used by cards that grant a reward independent of the normal action (Dutch
   * Mountains re-triggering an old position, Corporate Espionage's opponent-facing effect).
   */
  public static grantRewardForPosition(player: IPlayer, position: number, marker: MarkerKind, options?: {skipJovianAndMicrobe?: boolean}): void {
    DeltaProjectExpansion.resolveReward(player, position, marker, options);
  }

  /** Non-mutating check for whether {@link forceAdvanceOneStep} would succeed right now. */
  public static canForceAdvanceOneStep(player: IPlayer, marker: MarkerKind, options?: {ignoreTag?: boolean}): boolean {
    const game = player.game;
    const progress = DeltaProjectExpansion.getMarkerData(player, marker);
    if (progress.blocked === true) {
      return false;
    }
    if (marker === 'epsilon' && (progress.position === VP2_POSITION || progress.position === VP5_POSITION)) {
      return false;
    }
    const newPos = progress.position + 1;
    if (newPos > MAX_TRACK_POSITION) {
      return false;
    }
    if (options?.ignoreTag !== true && !DeltaProjectExpansion.canReachPosition(player, newPos)) {
      return false;
    }
    if ((newPos === VP2_POSITION || newPos === VP5_POSITION) &&
      DeltaProjectExpansion.isOccupiedByOther(game, newPos, player, marker)) {
      return false;
    }
    return true;
  }

  /**
   * Moves `marker` exactly one step, without spending energy and without going through
   * {@link getValidAdvanceSteps} (so it can't be used to jump multiple steps, or land on
   * an occupied VP spot). Used by cards that grant a one-off Delta Project step outside the
   * normal action (Corporate Espionage, Dynamic Ocean Barrier).
   *
   * Returns false (and does nothing) if the move isn't legal - beyond the end of the track,
   * onto an occupied VP spot, or (unless `ignoreTag` is set) missing the required tag.
   */
  public static forceAdvanceOneStep(player: IPlayer, marker: MarkerKind, options?: {ignoreTag?: boolean}): boolean {
    if (!DeltaProjectExpansion.canForceAdvanceOneStep(player, marker, options)) {
      return false;
    }
    const progress = DeltaProjectExpansion.getMarkerData(player, marker);
    const newPos = progress.position + 1;

    progress.position = newPos;
    DeltaProjectExpansion.grantRewardForPosition(player, newPos, marker);
    DeltaProjectExpansion.notifyMovement(player, 1, true);
    return true;
  }

  /**
   * Moves `marker` exactly one step backward outright - no energy, no tag check - used by
   * Corporate Espionage to push another player's primary marker down. Does nothing if the
   * marker is already at position 0 or already at a VP spot (per that card's own text).
   */
  public static forceRetreatOneStep(player: IPlayer, marker: MarkerKind): boolean {
    const progress = DeltaProjectExpansion.getMarkerData(player, marker);
    if (progress.position <= 0 || progress.position === VP2_POSITION || progress.position === VP5_POSITION) {
      return false;
    }
    progress.position -= 1;
    DeltaProjectExpansion.grantRewardForPosition(player, progress.position, marker);
    DeltaProjectExpansion.notifyMovement(player, 1, false);
    return true;
  }

  private static resolveReward(player: IPlayer, position: number, marker: MarkerKind, options?: {skipJovianAndMicrobe?: boolean}): void {
    // Positions 10/11 (VP spots) have no additional reward beyond VP claiming.
    switch (DELTA_TRACK_TAGS[position]) {
    case Tag.BUILDING: // Choose 2 steel or 2 plants
      player.defer(() => new OrOptions(
        new SelectOption('Gain 2 steel', 'Gain steel').andThen(() => {
          player.stock.add(Resource.STEEL, 2, {log: true, from: {card: CardName.DELTA_PROJECT}});
          return undefined;
        }),
        new SelectOption('Gain 2 plants', 'Gain plants').andThen(() => {
          player.stock.add(Resource.PLANTS, 2, {log: true, from: {card: CardName.DELTA_PROJECT}});
          return undefined;
        }),
      ));
      break;

    case Tag.POWER: // Choose +1 energy production or +1 heat production
      player.defer(() => new OrOptions(
        new SelectOption('Increase energy production 1 step', 'Increase').andThen(() => {
          player.production.add(Resource.ENERGY, 1, {log: true, from: {card: CardName.DELTA_PROJECT}});
          return undefined;
        }),
        new SelectOption('Increase heat production 1 step', 'Increase').andThen(() => {
          player.production.add(Resource.HEAT, 1, {log: true, from: {card: CardName.DELTA_PROJECT}});
          return undefined;
        }),
      ));
      break;

    case Tag.EARTH: // +2 MC production
      player.production.add(Resource.MEGACREDITS, 2, {log: true, from: {card: CardName.DELTA_PROJECT}});
      break;

    case Tag.SPACE: // +1 titanium production
      player.production.add(Resource.TITANIUM, 1, {log: true, from: {card: CardName.DELTA_PROJECT}});
      break;

    case Tag.SCIENCE: // Look at top 4 cards, take 2, discard rest
      player.game.defer(DrawCards.keepSome(player, 4, {keepMax: 2}));
      break;

    case Tag.PLANT: { // Gain 1 plant per plant tag
      const plantCount = player.tags.count(Tag.PLANT);
      player.stock.add(Resource.PLANTS, plantCount, {log: true, from: {card: CardName.DELTA_PROJECT}});
      break;
    }

    case Tag.MICROBE: { // Reuse a used blue card action
      if (options?.skipJovianAndMicrobe) {
        break;
      }
      const actionCards = DeltaProjectExpansion.getUsedActionCards(player);
      if (actionCards.length > 0) {
        player.defer(() => new SelectCard<IActionCard & ICard>(
          'Use a blue card action that has already been used this generation',
          'Take action',
          actionCards,
        ).andThen(([card]) => {
          player.game.log('${0} reused ${1} action via ${2}', (b) => b.player(player).card(card).cardName(CardName.DELTA_PROJECT));
          return card.action(player);
        }));
      }
      break;
    }

    case Tag.JOVIAN: { // Gain one Jovian tag
      if (options?.skipJovianAndMicrobe) {
        break;
      }
      const progress = DeltaProjectExpansion.getMarkerData(player, marker);
      if (!progress.jovianBonus) {
        progress.jovianBonus = true;
        player.tags.extraJovianTags++;
        player.triggerOnNonCardTagAdded(Tag.JOVIAN);
        for (const p of player.game.playersInGenerationOrder) {
          for (const card of p.tableau) {
            card.onNonCardTagAddedByAnyPlayer?.(p, Tag.JOVIAN);
          }
        }
        player.game.log('${0} gained a Jovian tag from the Delta Project', (b) => b.player(player));
      }
      break;
    }

    case Tag.ANIMAL: // Add 2 animals to any card
      player.game.defer(new AddResourcesToCard(player, CardResource.ANIMAL, {count: 2}));
      break;
    }
  }

  private static getUsedActionCards(player: IPlayer): Array<IActionCard & ICard> {
    const result: Array<IActionCard & ICard> = [];
    for (const playedCard of player.tableau) {
      if (!isIActionCard(playedCard)) {
        continue;
      }
      if (isIHasCheckLoops(playedCard) && playedCard.getCheckLoops() >= 2) {
        continue;
      }
      if (player.actionsThisGeneration.has(playedCard.name) && playedCard.canAct(player)) {
        result.push(playedCard);
      }
    }
    return result;
  }

  private static vpForMarker(progress: DeltaProjectPlayerModel | undefined): number {
    if (progress === undefined) {
      return 0;
    }
    if (progress.position === VP5_POSITION) {
      return 5;
    }
    if (progress.position === VP2_POSITION) {
      return 2;
    }
    return 0;
  }

  public static calculateVictoryPoints(player: IPlayer, builder: VictoryPointsBreakdownBuilder): void {
    // A player's two markers don't stack their VP spot bonuses - take whichever is higher.
    const points = Math.max(
      DeltaProjectExpansion.vpForMarker(player.deltaProjectData),
      DeltaProjectExpansion.vpForMarker(player.epsilonDampleData),
    );

    if (points > 0) {
      builder.setVictoryPoints('victoryPoints', points, `Delta Project (${points}VP)`);
    }
  }
}
