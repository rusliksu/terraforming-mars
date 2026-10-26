import {CustomCardDefinition} from './CustomCardDefinition';

// A row in the public card review queue on `/cards`: a community-submitted custom card, tagged
// `submitted` until an admin approves it (at which point it just blends in as an ordinary card --
// no `approved` tag is shown). See `customCardCodec.ts` for the opaque `shareCode` format.
export type CustomCardEntryId = `c${string}`;

export function isCustomCardEntryId(object: string): object is CustomCardEntryId {
  return object?.charAt?.(0) === 'c';
}

export type CustomCardStatus = 'submitted' | 'approved';

export const MAX_CUSTOM_CARD_SUBMITTED_BY_LENGTH = 40;

export interface CustomCardLibraryEntry {
  id: CustomCardEntryId;
  // Canonical source -- stored decoded (not just an opaque code) because the admin
  // set-behavior action mutates `definition.behavior` in place, and the boot-time
  // CustomCardRegistry needs cheap structured access on every server start.
  definition: CustomCardDefinition;
  // Derived convenience field for the "Copy code" button; recomputed whenever `definition` changes.
  shareCode: string;
  // Free-text credit line. Unverifiable -- there is no user-account system in this project.
  submittedBy: string;
  status: CustomCardStatus;
  createdAt: number; // epoch millis
}
