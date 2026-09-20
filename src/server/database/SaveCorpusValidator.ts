import {Game} from '../Game';
import {SerializedGame} from '../SerializedGame';

export type SerializedGameRow = {
  gameId: string;
  serialized: string;
};

export type SaveCorpusValidationSummary = {
  validated: number;
};

/** Validates that every serialized save survives the current application codec. */
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
      JSON.stringify(roundTrip);
    } catch {
      throw new Error(`Could not validate latest save for ${row.gameId}.`);
    }
  }

  return {validated: rows.length};
}
