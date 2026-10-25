import type {GameModule} from '@/common/cards/GameModule';
import {expansionChoices} from './expansionChoices';
import {expansionContents} from './expansionContents';
import type {ContentKey, ExpansionContents} from './expansionContents';
import type {TraitKey} from './expansionFeatures';

// Source grouping controls use our complete manifests, tile types and public board surfaces.
export const EXPANSION_GROUPINGS = ['source', 'layout', 'newParameters', 'project', 'corporation', 'prelude', 'newTiles', 'award', 'milestone'] as const;
export type ExpansionGrouping = typeof EXPANSION_GROUPINGS[number];
export const GROUPING_LABELS: Readonly<Record<ExpansionGrouping, string>> = {
  source: 'Source', layout: 'Board', newParameters: 'Global parameters', project: 'Project cards',
  corporation: 'Corporations', prelude: 'Prelude cards', newTiles: 'New tiles', award: 'Awards', milestone: 'Milestones',
};
type PresenceGrouping = Exclude<ExpansionGrouping, 'source' | 'layout'>;
const PRESENCE: Readonly<Record<PresenceGrouping, {content?: ContentKey, trait?: TraitKey, with: string, without: string}>> = {
  newParameters: {trait: 'newParameters', with: 'With new global parameters', without: 'Without new global parameters'},
  project: {content: 'project', with: 'With project cards', without: 'Without project cards'},
  corporation: {content: 'corporation', with: 'With corporations', without: 'Without corporations'},
  prelude: {content: 'prelude', with: 'With preludes', without: 'Without preludes'},
  newTiles: {trait: 'newTiles', with: 'With new tiles', without: 'Without new tiles'},
  award: {content: 'award', with: 'With awards', without: 'Without awards'},
  milestone: {content: 'milestone', with: 'With milestones', without: 'Without milestones'},
};
export type ExpansionTile = {module: GameModule, official: boolean, choice?: typeof expansionChoices[number]};
export type ExpansionGroup = {key: string, title: string, tiles: ReadonlyArray<ExpansionTile>, highlight?: ContentKey | TraitKey};
export const EXPANSION_TILES: ReadonlyArray<ExpansionTile> = [
  {module: 'base', official: true}, ...expansionChoices.filter((choice) => choice.official).map((choice) => ({module: choice.expansion, official: true, choice})),
  ...expansionChoices.filter((choice) => !choice.official).map((choice) => ({module: choice.expansion, official: false, choice})),
];

export function groupExpansions(grouping: ExpansionGrouping, contents: (module: GameModule) => ExpansionContents = expansionContents): Array<ExpansionGroup> {
  if (grouping === 'source') {
    return [{key: 'official', title: 'Official', tiles: EXPANSION_TILES.filter((tile) => tile.official)},
      {key: 'fan', title: 'Fan-made', tiles: EXPANSION_TILES.filter((tile) => !tile.official)}];
  }
  if (grouping === 'layout') {
    const layout = (tile: ExpansionTile) => contents(tile.module).layout ?? 'cardsAndVariants';
    return [
      {key: 'ownBoard', title: 'Own board or panel', tiles: EXPANSION_TILES.filter((tile) => layout(tile) === 'ownBoard'), highlight: 'ownBoard' as const},
      {key: 'changesMars', title: 'Changes Mars', tiles: EXPANSION_TILES.filter((tile) => layout(tile) === 'changesMars'), highlight: 'newTiles' as const},
      {key: 'cardsAndVariants', title: 'Cards and variants', tiles: EXPANSION_TILES.filter((tile) => layout(tile) === 'cardsAndVariants')},
    ].filter((group) => group.tiles.length > 0);
  }
  const test = PRESENCE[grouping];
  const has = (tile: ExpansionTile) => test.trait === undefined ? (test.content !== undefined && (contents(tile.module).counts[test.content] ?? 0) > 0) :
    contents(tile.module).traits?.has(test.trait) === true;
  return [{key: 'with', title: test.with, tiles: EXPANSION_TILES.filter(has), highlight: test.trait ?? test.content},
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
