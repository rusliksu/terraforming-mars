export type CompletionOutcome = 'completed' | 'surrendered' | 'left';

export type CompletionRank = {
  completionOutcome: CompletionOutcome;
  vp: number;
  megacredits: number;
  shareRemainingPlaces?: boolean;
};

export type SharedPlaceRange = {
  place: number;
  placeFrom: number;
  placeTo: number;
};

const OUTCOME_PRIORITY: Record<CompletionOutcome, number> = {
  completed: 0,
  surrendered: 1,
  left: 2,
};

export function normalizeCompletionOutcome(value: unknown): CompletionOutcome | undefined {
  return value === 'completed' || value === 'surrendered' || value === 'left' ? value : undefined;
}

export function isLastActivePlayerFinish(playerCount: number, surrenderedPlayerCount: number): boolean {
  return playerCount > 1 && surrenderedPlayerCount === playerCount - 1;
}

export function getSharedRemainingPlaceRange(playerCount: number): SharedPlaceRange {
  if (playerCount <= 1) {
    throw new RangeError('Shared remaining places require a multiplayer game');
  }
  return {
    place: (playerCount + 2) / 2,
    placeFrom: 2,
    placeTo: playerCount,
  };
}

export function compareCompletionRank(left: CompletionRank, right: CompletionRank): number {
  const leftSharesRemainingPlaces = left.shareRemainingPlaces === true;
  const rightSharesRemainingPlaces = right.shareRemainingPlaces === true;
  if (leftSharesRemainingPlaces !== rightSharesRemainingPlaces) {
    return leftSharesRemainingPlaces ? 1 : -1;
  }
  if (leftSharesRemainingPlaces) {
    return 0;
  }
  const outcomeDelta = OUTCOME_PRIORITY[left.completionOutcome] - OUTCOME_PRIORITY[right.completionOutcome];
  if (outcomeDelta !== 0) {
    return outcomeDelta;
  }
  if (left.vp !== right.vp) {
    return right.vp - left.vp;
  }
  return right.megacredits - left.megacredits;
}

export function hasSameCompletionRank(left: CompletionRank, right: CompletionRank): boolean {
  const leftSharesRemainingPlaces = left.shareRemainingPlaces === true;
  const rightSharesRemainingPlaces = right.shareRemainingPlaces === true;
  if (leftSharesRemainingPlaces || rightSharesRemainingPlaces) {
    return leftSharesRemainingPlaces && rightSharesRemainingPlaces;
  }
  return left.completionOutcome === right.completionOutcome &&
    left.vp === right.vp &&
    left.megacredits === right.megacredits;
}

export function stricterCompletionOutcome(
  left: CompletionOutcome | undefined,
  right: CompletionOutcome | undefined,
): CompletionOutcome | undefined {
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }
  return OUTCOME_PRIORITY[left] >= OUTCOME_PRIORITY[right] ? left : right;
}
