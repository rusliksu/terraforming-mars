import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {ActionLabel} from '@/client/components/overview/ActionLabel';
import {InterfaceTagsType} from '@/client/wrybit/visuals/overview/playerTagDetails';
import {GOODS_BOX_INSET} from '@/client/wrybit/visuals/overview/goodsBoxWidths';

// Player list as a table in the two-column layout: sections, stored toggles and column grid.
// All rows (header and players) use the same grid so the columns line up.

export const TABLE_SECTIONS = ['goods', 'tags', 'score'] as const;
export type TableSection = typeof TABLE_SECTIONS[number];
export type SectionVisibility = Record<TableSection, boolean>;

// Order of the sections, as in the classic player bar: resources, then the score group (hand cards,
// actions, VP, TR, played cards), then the tags on the right
export const DESKTOP_SECTION_ORDER: ReadonlyArray<TableSection> = ['goods', 'score', 'tags'];
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

export const DEFAULT_VISIBILITY: SectionVisibility = {goods: true, tags: true, score: true};

// Widths: name fixed, score fixed, only resources and tags share the free space.
// Divider columns are wider than the gaps within a section (law of proximity).
const NAME_WIDTH = 240;
// Escape Velocity adds a clock line with bar, time and VP penalty below the corporation – it needs more room
const ESCAPE_VELOCITY_NAME_WIDTH = 252;
const DIVIDER_WIDTH = 12;
const TAG_GROUP_GAP = 10;
const PLAYED_CARDS_WIDTH = 56;
const GOODS_MIN_WIDTH = 72;
// Tag column: the 34 px icon centred in a 42 px track keeps the classic 8 px gap between tags
const TAG_COLUMN_WIDTH = 42;
const SCORE_WIDTH = 44;
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
  if (visibility.score) {
    // Score group as in the classic bar: hand cards, actions, VP, TR, then the played cards count
    tracks.push(divider, `repeat(${SCORE_COUNT}, ${px(SCORE_WIDTH)})`, px(PLAYED_CARDS_WIDTH));
  }
  if (visibility.tags && tagColumns.length > 0) {
    tracks.push(divider, tagColumns.map((group) => `repeat(${group.length}, ${px(TAG_COLUMN_WIDTH)})`).join(` ${px(TAG_GROUP_GAP)} `));
  }
  return tracks.join(' ');
}

// Minimum width of the grid – same measures as columnTemplate
export function minimumWidth(visibility: SectionVisibility, tagColumns: TagColumnGroups, nameWidth: number = NAME_WIDTH, goodsBoxWidths: ReadonlyArray<number> = [], goodsCount = GOODS_COUNT): number {
  let width = nameWidth;
  if (visibility.goods) {
    width += DIVIDER_WIDTH + goodsMinWidths(goodsBoxWidths, goodsCount).reduce((sum, columnWidth) => sum + columnWidth, 0);
  }
  if (visibility.score) {
    width += DIVIDER_WIDTH + SCORE_COUNT * SCORE_WIDTH + PLAYED_CARDS_WIDTH;
  }
  if (visibility.tags && tagColumns.length > 0) {
    const tagCount = tagColumns.reduce((sum, group) => sum + group.length, 0);
    width += DIVIDER_WIDTH + tagCount * TAG_COLUMN_WIDTH + (tagColumns.length - 1) * TAG_GROUP_GAP;
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
export function fitToWidth(wanted: SectionVisibility, tagColumns: TagColumnGroups, availableWidth: number, nameWidth: number = NAME_WIDTH, goodsBoxWidths: ReadonlyArray<number> = [], goodsCount = GOODS_COUNT): FittedVisibility {
  const visibility = {...wanted};
  const autoHidden: Array<TableSection> = [];
  if (availableWidth <= 0) {
    return {visibility, autoHidden};
  }
  for (const section of AUTO_HIDE_ORDER) {
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
