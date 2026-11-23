import {expect} from 'chai';
import {PostgreSQL} from '@/server/database/PostgreSQL';
import {Game} from '@/server/Game';
import {IGame} from '@/server/IGame';
import {testGame} from '../TestGame';
import {ActionReplayState, promptFingerprintForPlayer} from '@/server/game/ActionReplay';
import {REPLAY_JOURNAL_ENTRY_LIMIT, restoreActionReplayState} from '@/server/database/ReplayJournal';
import {InputResponse} from '@/common/inputs/InputResponse';

const password = process.env.POSTGRES_INTEGRATION_TEST_PASSWORD;

class TestPostgreSQL extends PostgreSQL {
  public get pool() {
    return this.client;
  }
  public async reset(gameId: string): Promise<void> {
    for (const table of ['game_action_replay', 'game_action_replay_head', 'games', 'game', 'participants']) {
      await this.client.query('DELETE FROM ' + table + ' WHERE game_id = $1', [gameId]);
    }
  }
}

function withJournal(game: IGame, actorId: string, entryCount: number): void {
  const fingerprint = promptFingerprintForPlayer(game, actorId);
  const state: ActionReplayState = {
    rootSnapshot: game.serialize(),
    rootSaveId: 0,
    entries: Array.from({length: entryCount}, (_unused, index) => ({
      actorId,
      promptFingerprint: fingerprint,
      input: {type: 'option', index} as unknown as InputResponse,
    })),
    currentActorId: actorId,
    currentPromptFingerprint: fingerprint,
    resetBeforeNextInput: false,
  };
  game.actionReplayState = state;
}

(password === undefined ? describe.skip : describe)('Replay journal on PostgreSQL', () => {
  let database: TestPostgreSQL;
  const gameId = 'g-replay-journal-pg-' + process.pid;

  async function openDatabase(): Promise<TestPostgreSQL> {
    const next = new TestPostgreSQL({user: 'tfmtest', database: 'tfmtest', host: 'localhost', password});
    await next.initialize();
    return next;
  }

  beforeEach(async () => {
    database = await openDatabase();
    await database.reset(gameId);
  });

  afterEach(async () => {
    await database.reset(gameId);
    await database.pool.end();
  });

  async function seedJournal(entryCount: number): Promise<IGame> {
    const [game, player] = testGame(2, {undoStepOption: true});
    (game as unknown as {id: string}).id = gameId;
    await database.saveGame(game);
    withJournal(game, player.id, entryCount);
    await database.saveGame(game);
    return game;
  }

  it('restores the journal after reconnecting to the database', async () => {
    const game = await seedJournal(2);
    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(gameId);
    expect(journal).to.not.be.undefined;
    expect(journal!.entries.length).to.equal(2);

    const rootSnapshot = await restarted.getGameVersion(gameId, journal!.rootSaveId);
    const fingerprint = promptFingerprintForPlayer(game, journal!.currentActorId);
    const restored = restoreActionReplayState(journal!, rootSnapshot, fingerprint);
    expect(restored.kind).to.equal('restored');
    await restarted.pool.end();
  });

  it('keeps the newest 32 entries across repeated saves', async () => {
    const game = await seedJournal(40);
    const journal = await database.readReplayJournal(gameId);
    expect(journal!.entries.length).to.equal(REPLAY_JOURNAL_ENTRY_LIMIT);
    await database.saveGame(game);
    const again = await database.readReplayJournal(gameId);
    expect(again!.entries.length).to.equal(32);
  });

  it('drops the journal when the root save is gone', async () => {
    await seedJournal(1);
    await database.pool.query('DELETE FROM games WHERE game_id = $1 AND save_id = 0', [gameId]);
    const journal = await database.readReplayJournal(gameId);
    let rootSnapshot;
    try {
      rootSnapshot = await database.getGameVersion(gameId, journal!.rootSaveId);
    } catch {
      rootSnapshot = undefined;
    }
    expect(restoreActionReplayState(journal!, rootSnapshot, 'any')).to.deep.equal({kind: 'dropped', reason: 'missing_root'});
  });

  it('leaves the journal untouched when a save is rejected', async () => {
    const game = await seedJournal(2);
    const before = await database.readReplayJournal(gameId);
    game.lastSaveId = 10_000;
    let rejected = false;
    try {
      await database.saveGame(game);
    } catch (_error) {
      rejected = true;
    }
    expect(rejected).to.be.true;
    const after = await database.readReplayJournal(gameId);
    expect(after!.currentPromptFingerprint).to.equal(before!.currentPromptFingerprint);
    expect(after!.entries.length).to.equal(before!.entries.length);
  });

  it('writes nothing for games without the step undo option', async () => {
    const [game, player] = testGame(2, {undoStepOption: false});
    (game as unknown as {id: string}).id = gameId;
    await database.saveGame(game);
    const fingerprint = promptFingerprintForPlayer(game, player.id);
    game.actionReplayState = {rootSnapshot: game.serialize(), rootSaveId: 0, entries: [{actorId: player.id, promptFingerprint: fingerprint, input: {type: 'option'} as unknown as InputResponse}], currentActorId: player.id, currentPromptFingerprint: fingerprint, resetBeforeNextInput: false};
    await database.saveGame(game);
    expect(await database.readReplayJournal(gameId)).to.be.undefined;
  });

  it('drops the journal when the prompt has moved on', async () => {
    await seedJournal(1);
    const journal = await database.readReplayJournal(gameId);
    const rootSnapshot = await database.getGameVersion(gameId, journal!.rootSaveId);
    expect(restoreActionReplayState(journal!, rootSnapshot, 'other-prompt')).to.deep.equal({kind: 'dropped', reason: 'fingerprint'});
  });
});
