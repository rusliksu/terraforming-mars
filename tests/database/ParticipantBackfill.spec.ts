import {expect} from 'chai';
import {GameId, ParticipantId} from '../../src/common/Types';
import {backfillMissingGameParticipants} from '../../src/server/database/ParticipantBackfill';
import {GameIdLedger} from '../../src/server/database/IDatabase';
import {SerializedGame} from '../../src/server/SerializedGame';

class FakeParticipantDatabase {
  public readonly games = new Map<GameId, SerializedGame>();
  public readonly entries: Array<GameIdLedger> = [];
  public readonly writes: Array<GameIdLedger> = [];
  public readonly unreadable = new Set<GameId>();

  public async getParticipants(): Promise<Array<GameIdLedger>> {
    return this.entries.map((entry) => ({
      gameId: entry.gameId,
      participantIds: [...entry.participantIds],
    }));
  }

  public async getGame(gameId: GameId): Promise<SerializedGame> {
    if (this.unreadable.has(gameId)) {
      throw new Error('unreadable');
    }
    const game = this.games.get(gameId);
    if (game === undefined) {
      throw new Error('not found');
    }
    return game;
  }

  public async storeParticipants(entry: GameIdLedger): Promise<void> {
    this.writes.push(entry);
    const existing = this.entries.find((candidate) => candidate.gameId === entry.gameId);
    if (existing === undefined) {
      this.entries.push(entry);
      return;
    }
    for (const participantId of entry.participantIds) {
      if (!existing.participantIds.includes(participantId)) {
        existing.participantIds.push(participantId);
      }
    }
  }
}

function serializedGame(playerIds: Array<string>, spectatorId = ''): SerializedGame {
  return {
    players: playerIds.map((id) => ({id})),
    spectatorId,
  } as unknown as SerializedGame;
}

function participantId(value: string): ParticipantId {
  return value as ParticipantId;
}

describe('backfillMissingGameParticipants', () => {
  it('adds only missing game participants and is idempotent', async () => {
    const db = new FakeParticipantDatabase();
    const existing: GameIdLedger = {
      gameId: 'g-existing' as GameId,
      participantIds: [participantId('p-existing')],
    };
    db.entries.push(existing);
    db.games.set(existing.gameId, serializedGame(['p-existing']));
    db.games.set('g-missing' as GameId, serializedGame(['p-blue', 'p-red'], 's-spectator'));

    const gameIds = new Set<GameId>([
      existing.gameId,
      'g-missing' as GameId,
    ]);
    const first = await backfillMissingGameParticipants(db, gameIds);

    expect(first).deep.eq({games: 1, participants: 3, failed: 0});
    expect(db.entries).deep.eq([
      existing,
      {
        gameId: 'g-missing',
        participantIds: ['p-blue', 'p-red', 's-spectator'],
      },
    ]);
    expect(db.writes).has.length(1);

    const second = await backfillMissingGameParticipants(db, gameIds);
    expect(second).deep.eq({games: 0, participants: 0, failed: 0});
    expect(db.writes).has.length(1);
    expect(db.entries).deep.eq([
      existing,
      {
        gameId: 'g-missing',
        participantIds: ['p-blue', 'p-red', 's-spectator'],
      },
    ]);
  });

  it('fills only the missing participants of a partially mapped game', async () => {
    const db = new FakeParticipantDatabase();
    db.entries.push({
      gameId: 'g-partial' as GameId,
      participantIds: [participantId('p-blue')],
    });
    db.games.set('g-partial' as GameId, serializedGame(['p-blue', 'p-red'], 's-spectator'));
    const gameIds = new Set<GameId>(['g-partial' as GameId]);

    const result = await backfillMissingGameParticipants(db, gameIds);

    expect(result).deep.eq({games: 1, participants: 2, failed: 0});
    expect(db.entries).deep.eq([
      {
        gameId: 'g-partial',
        participantIds: ['p-blue', 'p-red', 's-spectator'],
      },
    ]);
    expect(db.writes).deep.eq([
      {
        gameId: 'g-partial',
        participantIds: ['p-red', 's-spectator'],
      },
    ]);

    const second = await backfillMissingGameParticipants(db, gameIds);
    expect(second).deep.eq({games: 0, participants: 0, failed: 0});
    expect(db.writes).has.length(1);
  });

  it('continues after an unreadable game and never removes existing mappings', async () => {
    const db = new FakeParticipantDatabase();
    const existing: GameIdLedger = {
      gameId: 'g-existing' as GameId,
      participantIds: [participantId('p-existing')],
    };
    db.entries.push(existing);
    db.games.set(existing.gameId, serializedGame(['p-existing']));
    db.games.set('g-good' as GameId, serializedGame(['p-good']));
    db.unreadable.add('g-bad' as GameId);

    const result = await backfillMissingGameParticipants(db, new Set<GameId>([
      existing.gameId,
      'g-bad' as GameId,
      'g-good' as GameId,
    ]));

    expect(result).deep.eq({games: 1, participants: 1, failed: 1});
    expect(db.entries).deep.eq([
      existing,
      {
        gameId: 'g-good',
        participantIds: ['p-good'],
      },
    ]);
  });
});
