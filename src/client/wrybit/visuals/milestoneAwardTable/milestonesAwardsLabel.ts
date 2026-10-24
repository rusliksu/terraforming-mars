// Uses the existing translations wherever milestones and awards share a heading.
export const MILESTONES_AWARDS_LABELS = ['Milestones', 'Awards'] as const;

export function milestonesAwardsLabel(translate: (text: string) => string): string {
  return MILESTONES_AWARDS_LABELS.map((label) => translate(label)).join(' & ');
}
