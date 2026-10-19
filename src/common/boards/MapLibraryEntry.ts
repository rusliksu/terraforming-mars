// A row in the public Map Library: an official board or a community-submitted custom map,
// listed and sorted by these tags. See `customBoardCodec.ts` for the opaque `code` format.
export type MapLibraryEntryId = `m${string}`;

export function isMapLibraryEntryId(object: string): object is MapLibraryEntryId {
  return object?.charAt?.(0) === 'm';
}

export type MapLibraryOrigin = 'official' | 'fanmade';

// Official entries are always 'approved' and never change status.
export type MapLibraryStatus = 'submitted' | 'approved';

export const MAX_MAP_LIBRARY_DESCRIPTION_LENGTH = 280;
export const MAX_MAP_LIBRARY_SUBMITTED_BY_LENGTH = 40;

export interface MapLibraryEntry {
  id: MapLibraryEntryId;
  // Opaque map-editor code (e.g. `TMB3…`). The only canonical source of the board's content --
  // the board's name lives inside the code (decode it to read `.name`), never stored separately,
  // so a future codec version bump only ever needs a compatibility shim in the codec itself.
  code: string;
  description: string;
  // Free-text credit line. Unverifiable -- there is no user-account system in this project.
  submittedBy: string;
  origin: MapLibraryOrigin;
  status: MapLibraryStatus;
  createdAt: number; // epoch millis
}
