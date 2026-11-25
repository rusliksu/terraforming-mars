import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {expect} from 'chai';
import {SQLite} from '@/server/database/SQLite';
import {Game} from '@/server/Game';
import {testGame} from '../TestGame';
import {
  ActionInputEntry,
  ActionReplayMismatch,
  promptFingerprintForPlayer,
  stepBackActionInput,
} from '@/server/game/ActionReplay';
import {
  rebuildLiveGameFromJournal,
  ReplayJournalSnapshot,
} from '@/server/database/ReplayJournal';
import {InputResponse} from '@/common/inputs/InputResponse';
import {PlayerId} from '@/common/Types';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {setTestDatabase, restoreTestDatabase} from '../testing/setup';

function respond(model: PlayerInputModel | undefined): InputResponse | undefined {
  if (model === undefined) {
    return undefined;
  }
  switch (model.type) {
  case 'or': {
    let index = model.options.findIndex((option) => /pass/i.test(String(option.title ?? option.buttonLabel ?? '')));
    if (index < 0) {
      index = 0;
    }
    const sub = respond(model.options[index]);
    return sub === undefined ? undefined : {type: 'or', index, response: sub};
  }
  case 'option':
    return {type: 'option'};
  case 'card': {
    const min = Number(model.min ?? 0);
    return {type: 'card', cards: model.cards.slice(0, Math.max(0, min)).map((card) => card.name)};
  }
  case 'initialCards': {
    const responses: Array<InputResponse> = [];
    for (const option of model.options) {
      const response = respond(option);
      if (response === undefined) {
        return undefined;
      }
      responses.push(response);
    }
    return {type: 'initialCards', responses};
  }
  default:
    return undefined;
  }
}

function collectEntries(game: Game, playerId: PlayerId, wanted: number): Array<ActionInputEntry> {
  const entries: Array<ActionInputEntry> = [];
  for (let index = 0; index < wanted; index++) {
    const actor = game.getPlayerById(playerId);
    const waiting = actor.getWaitingFor();
    if (waiting === undefined) {
      throw new Error('No prompt at step ' + index + ', collected ' + entries.length);
    }
    const fingerprint = promptFingerprintForPlayer(game, playerId);
    const input = respond(waiting.toModel(actor));
    if (input === undefined) {
      throw new Error('No input for prompt at step ' + index);
    }
    const logStartIndex = game.gameLog.length;
    actor.process(input);
    entries.push({actorId: playerId, promptFingerprint: fingerprint, input, logStartIndex});
  }
  return entries;
}

describe('Replay journal with 32 single-actor steps', () => {
  let dbFile: string;
  let db: SQLite;

  async function openDatabase(): Promise<SQLite> {
    const next = new SQLite(dbFile, false);
    await next.initialize();
    setTestDatabase(next);
    return next;
  }

  beforeEach(async () => {
    // Scoped to these tests so other suites keep the normal generation cap.
    process.env.TM_TEST_BUILD = '1';
    process.env.TM_TEST_LAST_SOLO_GENERATION = '25';
    dbFile = path.join(os.tmpdir(), 'tm-replay-32-' + process.pid + '-' + Date.now() + '.db');
    db = await openDatabase();
  });

  afterEach(() => {
    delete process.env.TM_TEST_BUILD;
    delete process.env.TM_TEST_LAST_SOLO_GENERATION;
    restoreTestDatabase();
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbFile + suffix);
      } catch {
        // ignore
      }
    }
  });

  it('unwinds all 32 steps and refuses the 33rd', async () => {
    const [rawGame, player] = testGame(1, {undoStepOption: true, skipInitialCardSelection: false});
    const game = rawGame as Game;
    const rootSnapshot = JSON.parse(JSON.stringify(game.serialize()));
    const entries = collectEntries(game, player.id, 32);
    expect(entries.length).to.equal(32);
    console.log('STEPS_COLLECTED', entries.length, 'generation', game.generation);

    await db.saveGame(game);
    const snapshot: ReplayJournalSnapshot = {
      gameId: game.id,
      rootSaveId: 0,
      rootSnapshot,
      currentActorId: player.id,
      currentPromptFingerprint: promptFingerprintForPlayer(game, player.id),
      resetBeforeNextInput: false,
      entries,
    };
    await db.writeReplayJournal(snapshot);

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    expect(journal).to.not.be.undefined;
    expect(journal!.entries.length).to.equal(32);

    const loaded = Game.deserialize(await restarted.getGame(game.id));
    const rebuilt = rebuildLiveGameFromJournal(loaded, journal!);
    expect(rebuilt.kind).to.equal('restored');
    if (rebuilt.kind !== 'restored') {
      throw new Error('expected restored, got ' + rebuilt.reason);
    }

    let current: Game = rebuilt.game;
    let undone = 0;
    for (let index = 0; index < 32; index++) {
      expect(current.actionReplayState?.entries.length).to.equal(32 - index);
      current = stepBackActionInput(current, player.id);
      undone++;
    }
    expect(undone).to.equal(32);
    const replayedPlayer = current.getPlayerById(player.id);
    expect(replayedPlayer.getWaitingFor()?.toModel(replayedPlayer)?.type).to.equal('initialCards');
    expect(() => stepBackActionInput(current, player.id)).to.throw(ActionReplayMismatch);
  }).timeout(30000);

  it('clamps a 33-step action to 32 and refuses the truncated journal', async () => {
    const [rawGame, player] = testGame(1, {undoStepOption: true, skipInitialCardSelection: false});
    const game = rawGame as Game;
    const rootSnapshot = JSON.parse(JSON.stringify(game.serialize()));
    const entries = collectEntries(game, player.id, 33);
    expect(entries.length).to.equal(33);

    await db.saveGame(game);
    const snapshot: ReplayJournalSnapshot = {
      gameId: game.id,
      rootSaveId: 0,
      rootSnapshot,
      currentActorId: player.id,
      currentPromptFingerprint: promptFingerprintForPlayer(game, player.id),
      resetBeforeNextInput: false,
      entries,
    };
    await db.writeReplayJournal(snapshot);

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    expect(journal).to.not.be.undefined;
    expect(journal!.entries.length).to.equal(32);
    console.log('CLAMPED_33_TO', journal!.entries.length);

    const loaded = Game.deserialize(await restarted.getGame(game.id));
    const rebuilt = rebuildLiveGameFromJournal(loaded, journal!);
    // Truncation drops the oldest step, so the replay fails immediately instead of silently
    // restoring the last 32 steps. Either failure reason is acceptable; a restore is not.
    if (rebuilt.kind !== 'dropped') {
      throw new Error('expected the truncated journal to be dropped');
    }
    console.log('TRUNCATED_REASON', rebuilt.reason);
    expect(['corrupt', 'fingerprint']).to.include(rebuilt.reason);
  }).timeout(30000);
});
