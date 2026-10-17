import type {GameModule} from '@/common/cards/GameModule';
import {expansionChoices} from './expansionChoices';
import {expansionContents} from './expansionContents';
import type {ContentKey, ExpansionContents} from './expansionContents';

// Count-based groupings use our complete manifests. Board/parameter/tile groupings await own facts.
export const EXPANSION_GROUPINGS = ['source', 'project', 'corporation', 'prelude', 'award', 'milestone'] as const;
export type ExpansionGrouping = typeof EXPANSION_GROUPINGS[number];
export const GROUPING_LABELS: Readonly<Record<ExpansionGrouping, string>> = {
  source: 'Source', project: 'Project cards', corporation: 'Corporations', prelude: 'Prelude cards', award: 'Awards', milestone: 'Milestones',
};
type PresenceGrouping = Exclude<ExpansionGrouping, 'source'>;
const PRESENCE: Readonly<Record<PresenceGrouping, {content: ContentKey, with: string, without: string}>> = {
  project: {content: 'project', with: 'With project cards', without: 'Without project cards'},
  corporation: {content: 'corporation', with: 'With corporations', without: 'Without corporations'},
  prelude: {content: 'prelude', with: 'With preludes', without: 'Without preludes'},
  award: {content: 'award', with: 'With awards', without: 'Without awards'},
  milestone: {content: 'milestone', with: 'With milestones', without: 'Without milestones'},
};
export type ExpansionTile = {module: GameModule, official: boolean, choice?: typeof expansionChoices[number]};
export type ExpansionGroup = {key: string, title: string, tiles: ReadonlyArray<ExpansionTile>, highlight?: ContentKey};
export const EXPANSION_TILES: ReadonlyArray<ExpansionTile> = [
  {module: 'base', official: true}, ...expansionChoices.filter((choice) => choice.official).map((choice) => ({module: choice.expansion, official: true, choice})),
  ...expansionChoices.filter((choice) => !choice.official).map((choice) => ({module: choice.expansion, official: false, choice})),
];

export function groupExpansions(grouping: ExpansionGrouping, contents: (module: GameModule) => ExpansionContents = expansionContents): Array<ExpansionGroup> {
  if (grouping === 'source') {
    return [{key: 'official', title: 'Official', tiles: EXPANSION_TILES.filter((tile) => tile.official)},
      {key: 'fan', title: 'Fan-made', tiles: EXPANSION_TILES.filter((tile) => !tile.official)}];
  }
  const test = PRESENCE[grouping];
  const has = (tile: ExpansionTile) => (contents(tile.module).counts[test.content] ?? 0) > 0;
  return [{key: 'with', title: test.with, tiles: EXPANSION_TILES.filter(has), highlight: test.content},
    {key: 'without', title: test.without, tiles: EXPANSION_TILES.filter((tile) => !has(tile))}].filter((group) => group.tiles.length > 0);
}

const STORAGE_KEY = 'wrybit-create-game-expansion-grouping';
export function loadExpansionGrouping(): ExpansionGrouping {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return EXPANSION_GROUPINGS.includes(value as ExpansionGrouping) ? value as ExpansionGrouping : 'source';
  } catch {
    return 'source';
  }
}
export function saveExpansionGrouping(grouping: ExpansionGrouping): void {
  try {
    localStorage.setItem(STORAGE_KEY, grouping);
  } catch { /* Cosmetic preference only. */ }
}
