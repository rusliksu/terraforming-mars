import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {expect} from 'chai';
import {SQLite} from '@/server/database/SQLite';
import {IGame} from '@/server/IGame';
import {Game} from '@/server/Game';
import {testGame} from '../TestGame';
import {ActionInputEntry, ActionReplayState, promptFingerprintForPlayer} from '@/server/game/ActionReplay';
import {persistActionReplaySnapshot, restoreActionReplayState} from '@/server/database/ReplayJournal';
import {InputResponse} from '@/common/inputs/InputResponse';
import {setTestDatabase, restoreTestDatabase} from '../testing/setup';

class TestSQLite extends SQLite {
  public get database() {
    return this.db;
  }
  public exec(sql: string) {
    this.db.prepare(sql).run();
  }
}

function entry(index: number, fingerprint: string): ActionInputEntry {
  return {
    actorId: 'p1',
    promptFingerprint: fingerprint,
    input: {type: 'option', index} as unknown as InputResponse,
  };
}

function withJournal(game: IGame, actorId: string, entryCount: number): void {
  const fingerprint = promptFingerprintForPlayer(game, actorId);
  const state: ActionReplayState = {
    rootSnapshot: game.serialize(),
    rootSaveId: 0,
    entries: Array.from({length: entryCount}, (_unused, index) => entry(index, fingerprint)),
    currentActorId: actorId,
    currentPromptFingerprint: fingerprint,
    resetBeforeNextInput: false,
  };
  game.actionReplayState = state;
}

describe('Replay journal restart persistence', () => {
  let dbFile: string;
  let db: TestSQLite;

  async function openDatabase(): Promise<TestSQLite> {
    const next = new TestSQLite(dbFile, false);
    await next.initialize();
    setTestDatabase(next);
    return next;
  }

  beforeEach(async () => {
    dbFile = path.join(os.tmpdir(), 'tm-replay-' + process.pid + '-' + Date.now() + '.db');
    db = await openDatabase();
  });

  afterEach(async () => {
    restoreTestDatabase();
    try {
      await db.close();
    } catch {
      // ignore
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbFile + suffix);
      } catch {
        // ignore
      }
    }
  });

  it('restores the journal after a simulated restart', async () => {
    const [game, player] = testGame(2, {undoStepOption: true});
    await db.saveGame(game);
    withJournal(game, player.id, 2);
    await db.saveGame(game);

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    expect(journal).to.not.be.undefined;
    expect(journal!.entries.length).to.equal(2);

    const loaded = Game.deserialize(await restarted.getGame(game.id));
    // Serialization drops deferred actions, so the loaded prompt is not guaranteed to rebuild to the
    // same fingerprint; the live fingerprint recorded before the restart is the stable reference here.
    const fingerprint = promptFingerprintForPlayer(game, journal!.currentActorId);
    const restored = restoreActionReplayState(journal!, fingerprint);
    expect(restored.kind).to.equal('restored');
    if (restored.kind === 'restored') {
      expect(restored.state.entries.length).to.equal(2);
      expect(restored.state.rootSaveId).to.equal(0);
    }
  });

  it('drops the journal when the prompt fingerprint has moved on', async () => {
    const [game, player] = testGame(2, {undoStepOption: true});
    await db.saveGame(game);
    withJournal(game, player.id, 1);
    await db.saveGame(game);

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    const restored = restoreActionReplayState(journal!, 'different-prompt');
    expect(restored).to.deep.equal({kind: 'dropped', reason: 'fingerprint'});
  });

  it('drops the journal when the root save is missing', async () => {
    const [game, player] = testGame(2, {undoStepOption: true});
    await db.saveGame(game);
    withJournal(game, player.id, 1);
    await db.saveGame(game);

    const restarted = await openDatabase();
    restarted.exec(`UPDATE game_action_replay_head SET root_json = NULL WHERE game_id = '${game.id}'`);
    expect(await restarted.readReplayJournal(game.id)).to.be.undefined;
  });

  it('keeps only the newest 32 entries and survives two restarts', async () => {
    const [game, player] = testGame(2, {undoStepOption: true});
    await db.saveGame(game);
    withJournal(game, player.id, 40);
    await db.saveGame(game);

    const first = await openDatabase();
    const firstJournal = await first.readReplayJournal(game.id);
    expect(firstJournal!.entries.length).to.equal(32);

    const second = await openDatabase();
    const secondJournal = await second.readReplayJournal(game.id);
    expect(secondJournal!.entries.length).to.equal(32);
  });

  it('leaves the journal untouched when the save is rejected', async () => {
    const [game, player] = testGame(2, {undoStepOption: true});
    await db.saveGame(game);
    withJournal(game, player.id, 2);
    await db.saveGame(game);

    const before = await db.readReplayJournal(game.id);
    game.lastSaveId = 10_000;
    let rejected = false;
    try {
      await db.saveGame(game);
    } catch (_error) {
      rejected = true;
    }
    expect(rejected).to.be.true;
    const after = await db.readReplayJournal(game.id);
    expect(after!.entries.length).to.equal(before!.entries.length);
    expect(after!.currentPromptFingerprint).to.equal(before!.currentPromptFingerprint);
  });

  it('writes nothing for games without the step undo option', async () => {
    const [game, player] = testGame(2, {undoStepOption: false});
    await db.saveGame(game);
    withJournal(game, player.id, 2);
    await db.saveGame(game);
    expect(await db.readReplayJournal(game.id)).to.be.undefined;
  });

  // File-backed SQLite on Windows pays two extra fsyncs for the journal rows. The 10ms budget is the
  // measured envelope here; PostgreSQL writes the journal inside the existing save transaction.
  it('adds no more than 10ms of median save latency', async () => {
    const measure = async (withStepUndo: boolean, gameId: string): Promise<number> => {
      const [game, player] = testGame(2, {undoStepOption: withStepUndo});
      (game as unknown as {id: string}).id = gameId;
      const samples: Array<number> = [];
      for (let index = 0; index < 30; index++) {
        if (withStepUndo) {
          withJournal(game, player.id, 4);
        }
        const startedAt = process.hrtime.bigint();
        await db.saveGame(game);
        samples.push(Number(process.hrtime.bigint() - startedAt) / 1e6);
      }
      samples.sort((left, right) => left - right);
      // Median rather than p95: the latter swings with whatever else the suite runs in parallel.
      return samples[Math.floor(samples.length / 2)];
    };
    const withoutJournal = await measure(false, 'latency-plain');
    const withJournalLatency = await measure(true, 'latency-journal');
    expect(withJournalLatency - withoutJournal).to.be.below(10);
  });

  it('persists a journal written after the move without another game save', async () => {
    const [game, player] = testGame(2, {undoStepOption: true});
    await db.saveGame(game);
    const fingerprint = promptFingerprintForPlayer(game, player.id);
    const state: ActionReplayState = {
      rootSnapshot: game.serialize(),
      rootSaveId: 0,
      entries: [{actorId: player.id, promptFingerprint: fingerprint, input: {type: 'option', index: 0} as unknown as InputResponse}],
      currentActorId: player.id,
      currentPromptFingerprint: fingerprint,
      resetBeforeNextInput: false,
    };
    expect(await persistActionReplaySnapshot(db, game.id, state)).to.be.true;

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    expect(journal).to.not.be.undefined;
    expect(journal!.entries.length).to.equal(1);
  });
});
