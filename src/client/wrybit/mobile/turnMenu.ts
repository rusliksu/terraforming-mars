import type {GlyphName} from '@/client/wrybit/visuals/common/mobileGlyphs';

/**
 * One entry of the mobile turn sheet (MobileTurnTile.vue): an action or an option the player
 * can pick. Labels/details are translation keys; tone/glyphTone are CSS suffixes
 * (mb-tile--<tone>, mb-tile-icon--<glyphTone>).
 */
export type TurnMenuTile = {
  /** Zero-based index into the source input's options. */
  index: number;
  label: string;
  detail?: string;
  glyph: GlyphName;
  glyphTone: string;
  tone?: string;
  /** No option is available for this slot (rendered dimmed, still selectable for its explanation). */
  empty?: boolean;
  /** Badge for the number of choices behind the tile (cards, projects, …). */
  count?: number;
};
