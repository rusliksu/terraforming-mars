import {GameId, ParticipantId} from '../../common/Types';
import {SerializedGame} from '../SerializedGame';
import {IDatabase} from './IDatabase';

type ParticipantDatabase = Pick<IDatabase, 'getParticipants' | 'getGame' | 'storeParticipants'>;

export type ParticipantBackfillResult = {
  /** Number of games for which participant rows were added. */
  games: number;
  /** Number of participant mappings added across those games. */
  participants: number;
  /** Number of games whose participant mappings could not be recovered. */
  failed: number;
};

/**
 * Recreates missing participant mappings from a game's latest saved state.
 *
 * Imported games can have save rows without save_id 0, so the normal first-save
 * path in SQLite/PostgreSQL never records participants. Without those rows the
 * cache cannot map a game, player, or spectator, and the game is invisible in
 * the admin list.
 *
 * This function only adds rows. It never changes or deletes games, saves, results,
 * or existing participant mappings.
 */
export async function backfillMissingGameParticipants(
  db: ParticipantDatabase,
  validGameIds: ReadonlySet<GameId>,
): Promise<ParticipantBackfillResult> {
  const knownGameIds = new Set((await db.getParticipants()).map((entry) => entry.gameId));
  const result: ParticipantBackfillResult = {games: 0, participants: 0, failed: 0};

  for (const gameId of validGameIds) {
    if (knownGameIds.has(gameId)) {
      continue;
    }

    let game: SerializedGame;
    try {
      game = await db.getGame(gameId);
    } catch (error) {
      result.failed++;
      console.warn('Could not read game state while backfilling participants', error);
      continue;
    }

    const participantIds = participantIdsFor(game);
    if (participantIds.length === 0) {
      result.failed++;
      console.warn('Could not derive participants while backfilling game participants');
      continue;
    }

    try {
      await db.storeParticipants({gameId, participantIds});
      knownGameIds.add(gameId);
      result.games++;
      result.participants += participantIds.length;
    } catch (error) {
      result.failed++;
      console.warn('Could not store backfilled game participants', error);
    }
  }

  return result;
}

function participantIdsFor(game: SerializedGame): Array<ParticipantId> {
  const participantIds = new Set<ParticipantId>();
  for (const player of game.players) {
    if (player.id) {
      participantIds.add(player.id);
    }
  }
  if (game.spectatorId) {
    participantIds.add(game.spectatorId);
  }
  return [...participantIds];
}
