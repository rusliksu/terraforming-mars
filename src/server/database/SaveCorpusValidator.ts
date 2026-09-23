import {Game} from '../Game';
import {SerializedGame} from '../SerializedGame';

export type SerializedGameRow = {
  gameId: string;
  serialized: string;
};

export type SaveCorpusValidationSummary = {
  validated: number;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function semanticSnapshot(serialized: SerializedGame): string {
  return JSON.stringify(canonicalize(serialized));
}

/** Validates that every serialized save is stable across two current-codec round trips. */
export function validateSerializedGameRows(rows: ReadonlyArray<SerializedGameRow>): SaveCorpusValidationSummary {
  for (const row of rows) {
    try {
      const serialized = JSON.parse(row.serialized) as SerializedGame;
      if (serialized.id !== row.gameId) {
        throw new Error('game id mismatch');
      }
      const roundTrip = Game.deserialize(serialized, {viewOnly: true}).serialize();
      if (roundTrip.id !== row.gameId) {
        throw new Error('round-trip game id mismatch');
      }
      const reloaded = Game.deserialize(roundTrip, {viewOnly: true}).serialize();
      if (reloaded.id !== row.gameId) {
        throw new Error('reload game id mismatch');
      }
      if (semanticSnapshot(roundTrip) !== semanticSnapshot(reloaded)) {
        throw new Error('semantic state changed after reload');
      }
    } catch {
      throw new Error(`Could not validate latest save for ${row.gameId}.`);
    }
  }

  return {validated: rows.length};
}
