import {Database} from './Database';
import {OFFICIAL_MAP_LIBRARY_BOARDS, FAN_MAP_LIBRARY_BOARDS, officialMapLibraryId} from '../../common/boards/officialMapLibrary';
import {MapLibraryOrigin} from '../../common/boards/MapLibraryEntry';
import {BoardName} from '../../common/boards/BoardName';

const SEEDED_BOARDS: ReadonlyArray<{boardName: BoardName, code: string, origin: MapLibraryOrigin}> = [
  ...OFFICIAL_MAP_LIBRARY_BOARDS.map((b) => ({...b, origin: 'official' as const})),
  ...FAN_MAP_LIBRARY_BOARDS.map((b) => ({...b, origin: 'fanmade' as const})),
];

/**
 * Seeds the Map Library with an 'approved' entry for every built-in board (official and
 * fan-made-but-bespoke-classed alike -- see officialMapLibrary.ts), if one doesn't already
 * exist. Safe to call on every server boot: the deterministic id (`officialMapLibraryId`) makes
 * this idempotent, and an admin who deletes a row won't have it silently resurrected until the
 * next boot -- an acceptable, explicit "restore defaults".
 *
 * Also self-heals a past classification bug: several fan boards (Hollandia, Arabia Terra, etc.)
 * were originally seeded with origin 'official' instead of 'fanmade'. origin/status/code are
 * derived entirely from static game data (never admin-edited), so correcting them on boot is
 * always safe; description/submittedBy/createdAt -- the only fields an admin could plausibly
 * have customized -- are preserved as-is.
 */
export async function seedOfficialMapLibrary(): Promise<void> {
  const db = Database.getInstance();
  for (const {boardName, code, origin} of SEEDED_BOARDS) {
    const id = officialMapLibraryId(boardName);
    const existing = await db.getMapLibraryEntry(id);
    if (existing === undefined) {
      await db.insertMapLibraryEntry({
        id,
        code,
        description: '',
        submittedBy: '',
        origin,
        status: 'approved',
        createdAt: Date.now(),
      });
    } else if (existing.origin !== origin) {
      await db.deleteMapLibraryEntry(id);
      await db.insertMapLibraryEntry({...existing, code, origin, status: 'approved'});
    }
  }
}
