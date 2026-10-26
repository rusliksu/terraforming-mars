import {BoardName} from './BoardName';
import {MapLibraryEntryId} from './MapLibraryEntry';
import {OFFICIAL_MAP_LIBRARY_BOARDS, FAN_MAP_LIBRARY_BOARDS, officialMapLibraryId} from './officialMapLibrary';

const ALL_BUILT_IN_BOARDS = [...OFFICIAL_MAP_LIBRARY_BOARDS, ...FAN_MAP_LIBRARY_BOARDS];

/**
 * Reverse lookup: which real BoardName (if any) a Map Library entry id refers to -- true for
 * every built-in board, official or fan-made alike, never for a community member's arbitrary
 * CustomBoardDefinition submission. Kept apart from the generated officialMapLibrary.ts so
 * regenerating that file never clobbers hand-written logic.
 */
export function boardNameForOfficialMapLibraryId(id: MapLibraryEntryId): BoardName | undefined {
  return ALL_BUILT_IN_BOARDS.find((b) => officialMapLibraryId(b.boardName) === id)?.boardName;
}
