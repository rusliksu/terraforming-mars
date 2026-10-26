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
 * or existing participant mappings. Games with a partially missing mapping are
 * repaired by adding only the participant ids that are absent.
 */
export async function backfillMissingGameParticipants(
  db: ParticipantDatabase,
  validGameIds: ReadonlySet<GameId>,
): Promise<ParticipantBackfillResult> {
  const knownParticipants = new Map<GameId, Set<ParticipantId>>();
  for (const entry of await db.getParticipants()) {
    knownParticipants.set(entry.gameId, new Set(entry.participantIds));
  }
  const result: ParticipantBackfillResult = {games: 0, participants: 0, failed: 0};

  async function backfillGame(gameId: GameId): Promise<void> {
    const existing = knownParticipants.get(gameId) ?? new Set<ParticipantId>();

    let game: SerializedGame;
    try {
      game = await db.getGame(gameId);
    } catch (error) {
      result.failed++;
      console.warn('Could not read game state while backfilling participants', error);
      return;
    }

    const expected = participantIdsFor(game);
    if (expected.length === 0) {
      if (existing.size === 0) {
        result.failed++;
        console.warn('Could not derive participants while backfilling game participants');
      }
      return;
    }
    const missing = expected.filter((participantId) => !existing.has(participantId));
    if (missing.length === 0) {
      return;
    }

    try {
      await db.storeParticipants({gameId, participantIds: missing});
      for (const participantId of missing) {
        existing.add(participantId);
      }
      knownParticipants.set(gameId, existing);
      result.games++;
      result.participants += missing.length;
    } catch (error) {
      result.failed++;
      console.warn('Could not store backfilled game participants', error);
    }
  }

  // Reading every resident game at startup is I/O heavy, so keep the number of
  // concurrent single-game reads bounded instead of deserializing everything at once.
  const queue = [...validGameIds];
  let next = 0;
  const workerCount = Math.min(8, queue.length);
  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (true) {
        const index = next++;
        if (index >= queue.length) {
          return;
        }
        await backfillGame(queue[index]);
      }
    })());
  }
  await Promise.all(workers);

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
