import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {ActionLabel} from '@/client/components/overview/ActionLabel';
import {InterfaceTagsType} from '@/client/wrybit/visuals/overview/playerTagDetails';
import {GOODS_BOX_INSET} from '@/client/wrybit/visuals/overview/goodsBoxWidths';

// Player list as a table in the two-column layout: sections, stored toggles and column grid.
// All rows (header and players) use the same grid so the columns line up.

export const TABLE_SECTIONS = ['goods', 'tags', 'score'] as const;
export type TableSection = typeof TABLE_SECTIONS[number];
export type SectionVisibility = Record<TableSection, boolean>;

// Order of the sections: on desktop tags before the score (columns by width), on mobile the score
// before the many tag rows, so VP and TR are visible without scrolling
export const DESKTOP_SECTION_ORDER: ReadonlyArray<TableSection> = ['goods', 'tags', 'score'];
export const MOBILE_SECTION_ORDER: ReadonlyArray<TableSection> = ['goods', 'score', 'tags'];

// One table row: player plus what PlayersOverview already computes for the classic bar
export type PlayersTableRowModel = {
  player: PublicPlayerModel;
  firstForGen: boolean;
  actionLabel: ActionLabel;
  playerIndex: number;
};

// Visible tag columns in groups (main tags | special tags), separated by a gap as in the classic bar
export type TagColumnGroups = Array<Array<InterfaceTagsType>>;

const STORAGE_KEY = 'wrybit_players_table_sections';
const PREFERRED_STORAGE_KEY = 'wrybit_players_table_preferred';
const DEFAULT_VISIBILITY: SectionVisibility = {goods: true, tags: true, score: true};

// Toggle state survives reloading; if storage is missing (private window), simply everything is on
export function loadSectionVisibility(): SectionVisibility {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {...DEFAULT_VISIBILITY, ...stored};
  } catch {
    return {...DEFAULT_VISIBILITY};
  }
}

export function saveSectionVisibility(visibility: SectionVisibility): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // Without storage the setting only lasts until reload
  }
}

// Section switched on last: is dropped last when space runs short (the last click wins)
export function loadPreferredSection(): TableSection | undefined {
  try {
    const stored = localStorage.getItem(PREFERRED_STORAGE_KEY);
    return TABLE_SECTIONS.find((section) => section === stored);
  } catch {
    return undefined;
  }
}

export function savePreferredSection(section: TableSection | undefined): void {
  try {
    if (section === undefined) {
      localStorage.removeItem(PREFERRED_STORAGE_KEY);
    } else {
      localStorage.setItem(PREFERRED_STORAGE_KEY, section);
    }
  } catch {
    // Without storage the setting only lasts until reload
  }
}

// Widths: name fixed, score fixed, only resources and tags share the free space.
// Divider columns are wider than the gaps within a section (law of proximity).
const NAME_WIDTH = 196;
// Escape Velocity adds a clock line with bar, time and VP penalty below the corporation – it needs more room
const ESCAPE_VELOCITY_NAME_WIDTH = 252;
const DIVIDER_WIDTH = 12;
const TAG_GROUP_GAP = 6;
const PLAYED_CARDS_WIDTH = 48;
const GOODS_MIN_WIDTH = 70;
const TAG_MIN_WIDTH = 23;
const SCORE_WIDTH = 34;
export const GOODS_COUNT = 6;
export const SCORE_COUNT = 4;

const px = (value: number) => `${value}px`;

export function nameColumnWidth(escapeVelocity: boolean): number {
  return escapeVelocity ? ESCAPE_VELOCITY_NAME_WIDTH : NAME_WIDTH;
}

// Minimum per resource column: wider where a box needs more room than the standard (goodsBoxWidths.ts)
function goodsMinWidths(goodsBoxWidths: ReadonlyArray<number>, goodsCount: number): Array<number> {
  return Array.from({length: goodsCount}, (_, index) => {
    const boxWidth = goodsBoxWidths[index] ?? 0;
    return boxWidth > 0 ? Math.max(GOODS_MIN_WIDTH, boxWidth + GOODS_BOX_INSET) : GOODS_MIN_WIDTH;
  });
}

export function columnTemplate(visibility: SectionVisibility, tagColumns: TagColumnGroups, nameWidth: number = NAME_WIDTH, goodsBoxWidths: ReadonlyArray<number> = [], goodsCount = GOODS_COUNT): string {
  const divider = px(DIVIDER_WIDTH);
  const tracks = [px(nameWidth)];
  if (visibility.goods) {
    tracks.push(divider, goodsMinWidths(goodsBoxWidths, goodsCount).map((width) => `minmax(${px(width)}, ${px(width + 18)})`).join(' '));
  }
  if (visibility.tags && tagColumns.length > 0) {
    tracks.push(divider, tagColumns.map((group) => `repeat(${group.length}, minmax(${px(TAG_MIN_WIDTH)}, ${px(TAG_MIN_WIDTH + 6)}))`).join(` ${px(TAG_GROUP_GAP)} `));
  }
  if (visibility.score) {
    tracks.push(divider, `repeat(${SCORE_COUNT}, ${px(SCORE_WIDTH)})`);
  }
  // Card count always visible, with its own divider
  tracks.push(divider, px(PLAYED_CARDS_WIDTH));
  return tracks.join(' ');
}

// Minimum width of the grid – same measures as columnTemplate
export function minimumWidth(visibility: SectionVisibility, tagColumns: TagColumnGroups, nameWidth: number = NAME_WIDTH, goodsBoxWidths: ReadonlyArray<number> = [], goodsCount = GOODS_COUNT): number {
  let width = nameWidth + DIVIDER_WIDTH + PLAYED_CARDS_WIDTH;
  if (visibility.goods) {
    width += DIVIDER_WIDTH + goodsMinWidths(goodsBoxWidths, goodsCount).reduce((sum, columnWidth) => sum + columnWidth, 0);
  }
  if (visibility.tags && tagColumns.length > 0) {
    const tagCount = tagColumns.reduce((sum, group) => sum + group.length, 0);
    width += DIVIDER_WIDTH + tagCount * TAG_MIN_WIDTH + (tagColumns.length - 1) * TAG_GROUP_GAP;
  }
  if (visibility.score) {
    width += DIVIDER_WIDTH + SCORE_COUNT * SCORE_WIDTH;
  }
  return width;
}

// Order in which sections drop out when the column is too narrow: scoring (VP/TR/hand/actions) stays
// longer than the resource boxes, because the tag strip below the row already carries the played tags.
const AUTO_HIDE_ORDER: Array<TableSection> = ['tags', 'goods', 'score'];

export type FittedVisibility = {
  visibility: SectionVisibility;
  // Sections hidden only for lack of space
  autoHidden: Array<TableSection>;
};

// Adapts the desired visibility to the available width; unknown width (0) changes nothing.
// The preferred (last switched on) section is dropped last.
export function fitToWidth(wanted: SectionVisibility, tagColumns: TagColumnGroups, availableWidth: number, preferred?: TableSection, nameWidth: number = NAME_WIDTH, goodsBoxWidths: ReadonlyArray<number> = [], goodsCount = GOODS_COUNT): FittedVisibility {
  const visibility = {...wanted};
  const autoHidden: Array<TableSection> = [];
  if (availableWidth <= 0) {
    return {visibility, autoHidden};
  }
  const order = [...AUTO_HIDE_ORDER.filter((section) => section !== preferred), ...(preferred ? [preferred] : [])];
  for (const section of order) {
    if (minimumWidth(visibility, tagColumns, nameWidth, goodsBoxWidths, goodsCount) <= availableWidth) {
      break;
    }
    if (visibility[section]) {
      visibility[section] = false;
      autoHidden.push(section);
    }
  }
  return {visibility, autoHidden};
}
