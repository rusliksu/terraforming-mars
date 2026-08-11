export type CompletionOutcome = 'completed' | 'surrendered' | 'left';

export type CompletionRank = {
  completionOutcome: CompletionOutcome;
  vp: number;
  megacredits: number;
};

const OUTCOME_PRIORITY: Record<CompletionOutcome, number> = {
  completed: 0,
  surrendered: 1,
  left: 2,
};

export function normalizeCompletionOutcome(value: unknown): CompletionOutcome | undefined {
  return value === 'completed' || value === 'surrendered' || value === 'left' ? value : undefined;
}

export function compareCompletionRank(left: CompletionRank, right: CompletionRank): number {
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
