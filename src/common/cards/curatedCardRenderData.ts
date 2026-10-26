import {Tag, ALL_TAGS} from './Tag';
import {CardResource} from '../CardResource';
import {CardRenderItemType} from './render/CardRenderItemType';
import {CardRenderSymbolType} from './render/CardRenderSymbolType';
import {Size} from './render/Size';
import {TileType} from '../TileType';
import {
  MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW,
  MAX_CUSTOM_CARD_RENDER_ROWS,
} from './CustomCardDefinition';

/**
 * The bounded vocabulary the icon composer (CardMaker.vue) may produce for a card's
 * `renderData` -- the actual security boundary for a public submission's icon tree (see
 * ApiCustomCardLibrary.ts), mirroring curatedBehaviorTemplates.ts's role for `behavior`.
 *
 * `ICardRenderItem.text`/`.innerText` are deliberately never allowed here: those two fields are
 * injected unescaped (`v-html`) by CardRenderItemComponent.vue, so a public submission carrying
 * either would be a stored-XSS vector once the card is approved and shown to other players. The
 * composer never emits them -- free-form labels go through a plain string row item instead
 * (rendered by CardDescription.vue via normal, escaped text interpolation), which this validator
 * still length-caps but doesn't need to sanitize for markup.
 *
 * Only a flat, single-level tree is allowed: no nested `production-box`/`effect`/`corp-box-*`
 * containers, no `root` rows-within-rows. A v1 custom card's icon row is a simple strip of
 * items/symbols/tiles/text, exactly what the composer's UI builds.
 */
export const MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH = 24;

const ITEM_TYPES: ReadonlySet<string> = new Set([
  CardRenderItemType.TEMPERATURE,
  CardRenderItemType.OXYGEN,
  CardRenderItemType.OCEANS,
  CardRenderItemType.VENUS,
  CardRenderItemType.PLANTS,
  CardRenderItemType.TR,
  CardRenderItemType.HEAT,
  CardRenderItemType.ENERGY,
  CardRenderItemType.TITANIUM,
  CardRenderItemType.STEEL,
  CardRenderItemType.MEGACREDITS,
  CardRenderItemType.CARDS,
  CardRenderItemType.TAG,
  CardRenderItemType.RESOURCE,
  CardRenderItemType.WILD,
  CardRenderItemType.CITY,
  CardRenderItemType.GREENERY,
  CardRenderItemType.VP,
  CardRenderItemType.NBSP,
]);

const SYMBOL_TYPES: ReadonlySet<string> = new Set([
  CardRenderSymbolType.PLUS,
  CardRenderSymbolType.MINUS,
  CardRenderSymbolType.ARROW,
  CardRenderSymbolType.COLON,
  CardRenderSymbolType.SLASH,
  CardRenderSymbolType.OR,
  CardRenderSymbolType.BRACKET_OPEN,
  CardRenderSymbolType.BRACKET_CLOSE,
  CardRenderSymbolType.EQUALS,
  CardRenderSymbolType.ASTERIX,
  CardRenderSymbolType.EMPTY,
  CardRenderSymbolType.NBSP,
]);

const TILE_TYPES: ReadonlySet<TileType> = new Set([TileType.CITY, TileType.GREENERY, TileType.OCEAN]);
const SIZES: ReadonlySet<string> = new Set(Object.values(Size));
const TAGS: ReadonlySet<Tag> = new Set(ALL_TAGS);
const RESOURCES: ReadonlySet<string> = new Set(Object.values(CardResource));

const ITEM_KEYS: ReadonlySet<string> = new Set(['is', 'type', 'amount', 'size', 'showDigit', 'amountInside', 'tag', 'resource']);
const SYMBOL_KEYS: ReadonlySet<string> = new Set(['is', 'type', 'size', 'isIcon', 'isSuperscript']);
const TILE_KEYS: ReadonlySet<string> = new Set(['is', 'tile']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSize(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && SIZES.has(value));
}

function isValidItem(value: Record<string, unknown>): boolean {
  if (!Object.keys(value).every((k) => ITEM_KEYS.has(k))) {
    return false;
  }
  if (typeof value.type !== 'string' || !ITEM_TYPES.has(value.type)) {
    return false;
  }
  if (typeof value.amount !== 'number' || !Number.isInteger(value.amount) || value.amount < 0 || value.amount > 20) {
    return false;
  }
  if (!isValidSize(value.size)) {
    return false;
  }
  if (value.showDigit !== undefined && value.showDigit !== true) {
    return false;
  }
  if (value.amountInside !== undefined && value.amountInside !== true) {
    return false;
  }
  if (value.type === CardRenderItemType.TAG) {
    if (typeof value.tag !== 'string' || !TAGS.has(value.tag as Tag)) {
      return false;
    }
  } else if (value.tag !== undefined) {
    return false;
  }
  if (value.type === CardRenderItemType.RESOURCE) {
    if (typeof value.resource !== 'string' || !RESOURCES.has(value.resource)) {
      return false;
    }
  } else if (value.resource !== undefined) {
    return false;
  }
  return true;
}

function isValidSymbol(value: Record<string, unknown>): boolean {
  if (!Object.keys(value).every((k) => SYMBOL_KEYS.has(k))) {
    return false;
  }
  if (typeof value.type !== 'string' || !SYMBOL_TYPES.has(value.type)) {
    return false;
  }
  if (value.isIcon !== undefined && value.isIcon !== true) {
    return false;
  }
  if (value.isSuperscript !== undefined && value.isSuperscript !== true) {
    return false;
  }
  return isValidSize(value.size);
}

function isValidTile(value: Record<string, unknown>): boolean {
  if (!Object.keys(value).every((k) => TILE_KEYS.has(k))) {
    return false;
  }
  return typeof value.tile === 'number' && TILE_TYPES.has(value.tile);
}

function isValidRowItem(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.length <= MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH;
  }
  if (!isPlainObject(value)) {
    return false;
  }
  switch (value.is) {
  case 'item': return isValidItem(value);
  case 'symbol': return isValidSymbol(value);
  case 'tile': return isValidTile(value);
  default: return false;
  }
}

/** Returns true iff `renderData` is a flat, bounded icon tree the composer could have produced. */
export function isCuratedRenderData(renderData: unknown): boolean {
  if (!isPlainObject(renderData) || renderData.is !== 'root' || !Array.isArray(renderData.rows)) {
    return false;
  }
  if (renderData.rows.length > MAX_CUSTOM_CARD_RENDER_ROWS) {
    return false;
  }
  return renderData.rows.every((row) => {
    return Array.isArray(row) && row.length <= MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW && row.every(isValidRowItem);
  });
}
