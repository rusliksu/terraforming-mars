import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {expect} from 'chai';
import {SQLite} from '@/server/database/SQLite';
import {Game} from '@/server/Game';
import {testGame} from '../TestGame';
import {Phase} from '@/common/Phase';
import {CardName} from '@/common/cards/CardName';
import {InputResponse} from '@/common/inputs/InputResponse';
import {
  ActionReplayState,
  promptFingerprintForPlayer,
  prepareActionReplayEntry,
  recordAcceptedActionReplayEntry,
  stepBackActionInput,
  ActionReplayMismatch,
} from '@/server/game/ActionReplay';
import {
  persistActionReplaySnapshot,
  rebuildLiveGameFromJournal,
  restoreActionReplayState,
} from '@/server/database/ReplayJournal';
import {ProjectEden} from '@/server/cards/prelude2/ProjectEden';
import {ArcticAlgae} from '@/server/cards/base/ArcticAlgae';
import {BiomassCombustors} from '@/server/cards/base/BiomassCombustors';
import {Comet} from '@/server/cards/base/Comet';
import {setTestDatabase, restoreTestDatabase} from '../testing/setup';

function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

describe('Replay journal at scale', () => {
  let dbFile: string;
  let db: SQLite;

  async function openDatabase(): Promise<SQLite> {
    const next = new SQLite(dbFile, false);
    await next.initialize();
    setTestDatabase(next);
    return next;
  }

  beforeEach(async () => {
    dbFile = path.join(os.tmpdir(), 'tm-replay-scale-' + process.pid + '-' + Date.now() + '.db');
    db = await openDatabase();
  });

  afterEach(async () => {
    restoreTestDatabase();
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbFile + suffix);
      } catch {
        // ignore
      }
    }
  });

  it('records root snapshot size at three game stages', () => {
    const [fresh] = testGame(2, {skipInitialCardSelection: true});
    const freshBytes = jsonBytes(fresh.serialize());

    const [rawMid] = testGame(2, {skipInitialCardSelection: true});
    const mid = rawMid as Game;
    mid.generation = 6;
    for (let index = 0; index < 300; index++) {
      mid.gameLog.push({message: 'log entry ' + index, color: 'blue'} as never);
    }
    const midBytes = jsonBytes(mid.serialize());

    const [rawLate] = testGame(2, {skipInitialCardSelection: true});
    const late = rawLate as Game;
    late.generation = 12;
    for (let index = 0; index < 1200; index++) {
      late.gameLog.push({message: 'log entry ' + index + ' with some longer text payload', color: 'red'} as never);
    }
    const lateBytes = jsonBytes(late.serialize());

    console.log('ROOT_BYTES fresh=' + freshBytes + ' mid=' + midBytes + ' late=' + lateBytes);
    expect(freshBytes).to.be.greaterThan(1000);
    expect(midBytes).to.be.greaterThan(0);
  });

  it('persists a real three-step action and steps back after a reopen', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoStepOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.preludeCardsInHand.push(new ProjectEden());
    player.cardsInHand.push(new ArcticAlgae(), new BiomassCombustors(), new Comet());
    player.takeAction(false);

    const accept = (input: InputResponse) => {
      const entry = prepareActionReplayEntry(game, player.id, input);
      expect(entry).not.eq(undefined);
      player.process(input);
      recordAcceptedActionReplayEntry(game, entry!);
    };
    accept({type: 'card', cards: [CardName.PROJECT_EDEN]});
    const choosePart = player.getWaitingFor()?.toModel(player);
    expect(choosePart?.type).eq('or');
    const cityIndex = choosePart?.type === 'or' ?
      choosePart.options.findIndex((option) => option.title === 'Place a city') : -1;
    expect(cityIndex).gte(0);
    accept({type: 'or', index: cityIndex, response: {type: 'option'}});
    const cityPrompt = player.getWaitingFor()?.toModel(player);
    if (cityPrompt?.type !== 'space') {
      throw new Error('Expected city placement prompt');
    }
    accept({type: 'space', spaceId: cityPrompt.spaces[0]});

    expect(game.board.spaces.some((space) => space.player?.id === player.id)).is.true;
    const state = game.actionReplayState!;
    expect(state.entries.length).to.equal(3);
    const rootBytes = jsonBytes(state.rootSnapshot);
    console.log('ROOT_BYTES real_three_step=' + rootBytes);

    await db.saveGame(game);
    expect(await persistActionReplaySnapshot(db, game.id, state)).to.be.true;

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    expect(journal).to.not.be.undefined;
    expect(journal!.entries.length).to.equal(3);
    // A plain deserialize cannot rebuild the mid-action prompt, so the loaded game is replaced by a
    // state replayed from the stored root and entries.
    const loaded = Game.deserialize(await restarted.getGame(game.id));
    // Plain deserialization rebuilds a different prompt, which is exactly why the journal is
    // validated against a replay instead of against the freshly loaded save.
    const loadedFingerprint = promptFingerprintForPlayer(loaded, journal!.currentActorId);
    console.log('COMPLEX_PROMPT loadedFp=' + loadedFingerprint + ' journalFp=' + journal!.currentPromptFingerprint +
      ' equal=' + (loadedFingerprint === journal!.currentPromptFingerprint));
    expect(loadedFingerprint).to.not.equal(journal!.currentPromptFingerprint);
    expect(restoreActionReplayState(journal!, loadedFingerprint)).to.deep.equal({kind: 'dropped', reason: 'fingerprint'});

    const rebuilt = rebuildLiveGameFromJournal(loaded, journal!);
    expect(rebuilt.kind).to.equal('restored');
    if (rebuilt.kind !== 'restored') {
      throw new Error('expected restored, got ' + rebuilt.reason);
    }
    expect(rebuilt.state.entries.length).to.equal(3);
    expect(rebuilt.state.currentPromptFingerprint).to.equal(journal!.currentPromptFingerprint);
    expect(rebuilt.game.actionReplayState).to.equal(rebuilt.state);

    const replayed = stepBackActionInput(rebuilt.game, player.id);
    const replayedPlayer = replayed.getPlayerById(player.id);
    expect(replayedPlayer.getWaitingFor()?.toModel(replayedPlayer)?.type).eq('or');
    expect(replayed.board.spaces.some((space) => space.player?.id === player.id)).is.false;
  });

  it('stores at most 32 entries and refuses to replay a truncated journal', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoStepOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.takeAction(false);
    const prompt = player.getWaitingFor();
    expect(prompt).not.eq(undefined);

    const state: ActionReplayState = {
      rootSnapshot: game.serialize(),
      rootSaveId: 0,
      entries: Array.from({length: 40}, (_unused, index) => ({
        actorId: player.id,
        promptFingerprint: 'prompt:step-' + index,
        input: {type: 'option'} as InputResponse,
        logStartIndex: index,
      })),
      currentActorId: player.id,
      currentPromptFingerprint: 'prompt:final',
      resetBeforeNextInput: false,
    };
    await db.saveGame(game);
    expect(await persistActionReplaySnapshot(db, game.id, state)).to.be.true;

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    expect(journal).to.not.be.undefined;
    expect(journal!.entries.length).to.equal(32);
    console.log('JOURNAL_TRUNCATED stored=' + journal!.entries.length + ' requested=40');

    const restored = restoreActionReplayState(journal!, 'prompt:final');
    expect(restored.kind).to.equal('restored');
    if (restored.kind !== 'restored') {
      throw new Error('expected restored');
    }
    const loaded = Game.deserialize(await restarted.getGame(game.id));
    loaded.actionReplayState = restored.state;
    expect(() => stepBackActionInput(loaded, player.id)).to.throw(ActionReplayMismatch);
  });

  it('drops a journal whose stored steps no longer replay', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoStepOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.takeAction(false);
    const state: ActionReplayState = {
      rootSnapshot: game.serialize(),
      rootSaveId: 0,
      entries: [{actorId: player.id, promptFingerprint: 'prompt:tampered', input: {type: 'option'} as InputResponse}],
      currentActorId: player.id,
      currentPromptFingerprint: 'prompt:tampered',
      resetBeforeNextInput: false,
    };
    await db.saveGame(game);
    expect(await persistActionReplaySnapshot(db, game.id, state)).to.be.true;

    const restarted = await openDatabase();
    const journal = await restarted.readReplayJournal(game.id);
    const loaded = Game.deserialize(await restarted.getGame(game.id));
    const rebuilt = rebuildLiveGameFromJournal(loaded, journal!);
    expect(rebuilt).to.deep.equal({kind: 'dropped', reason: 'corrupt'});
  });
});
