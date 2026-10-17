import {CardType} from '@/common/cards/CardType';
import type {GameModule} from '@/common/cards/GameModule';
import {getCards} from '@/client/cards/ClientCardManifest';
import {buildEntries} from '@/client/wrybit/visuals/cardlist/cardListEntries';
import type {CardListEntry} from '@/client/wrybit/visuals/cardlist/cardListEntries';

export const CONTENT_KEYS = ['project', 'corporation', 'prelude', 'ceo', 'globalEvent', 'colonyTile', 'standardProject', 'award', 'milestone'] as const;
export type ContentKey = typeof CONTENT_KEYS[number];
export type ExpansionContents = {counts: Partial<Record<ContentKey, number>>};

const CONTENT_BY_TYPE: Partial<Record<CardListEntry['type'], ContentKey>> = {
  [CardType.AUTOMATED]: 'project', [CardType.ACTIVE]: 'project', [CardType.EVENT]: 'project',
  [CardType.CORPORATION]: 'corporation', [CardType.PRELUDE]: 'prelude', [CardType.CEO]: 'ceo',
  [CardType.STANDARD_PROJECT]: 'standardProject', globalEvents: 'globalEvent', colonyTiles: 'colonyTile',
  awards: 'award', milestones: 'milestone',
};

/** Count our registered public content; no source-fork quantities or replacement rules. */
export function countModuleContents(entries: ReadonlyArray<Pick<CardListEntry, 'module' | 'type'>>, standardActions: ReadonlyArray<{module: GameModule}>): Map<GameModule, ExpansionContents> {
  const result = new Map<GameModule, ExpansionContents>();
  function add(module: GameModule | undefined, key: ContentKey | undefined) {
    if (module === undefined || key === undefined) {
      return;
    }
    // These are additions to the base game, whose board defines its own MA and standard projects.
    if (module === 'base' && ['award', 'milestone', 'standardProject'].includes(key)) {
      return;
    }
    let contents = result.get(module);
    if (contents === undefined) {
      contents = {counts: {}}; result.set(module, contents);
    }
    contents.counts[key] = (contents.counts[key] ?? 0) + 1;
  }
  for (const entry of entries) {
    add(entry.module, CONTENT_BY_TYPE[entry.type]);
  }
  for (const action of standardActions) {
    add(action.module, 'standardProject');
  }
  return result;
}

let contents: Map<GameModule, ExpansionContents> | undefined;
export function expansionContents(module: GameModule): ExpansionContents {
  contents ??= countModuleContents(buildEntries(), getCards((card) => card.type === CardType.STANDARD_ACTION));
  return contents.get(module) ?? {counts: {}};
}
