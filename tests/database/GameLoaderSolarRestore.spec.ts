import {expect} from 'chai';
import {GameLoader} from '../../src/server/database/GameLoader';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {restoreTestDatabase, restoreTestGameLoader, setTestDatabase, setTestGameLoader} from '../testing/setup';
import {FakeClock} from '../common/FakeClock';
import {testGame} from '../TestingUtils';
import {Phase} from '../../src/common/Phase';
import {OrOptions} from '../../src/server/inputs/OrOptions';

describe('GameLoader solar restore', () => {
  let instance: GameLoader;

  beforeEach(() => {
    instance = GameLoader.newTestInstance(
      {sleepMillis: 0, evictMillis: 100, idleMillis: 1000, sweep: 'manual'},
      new FakeClock());
    setTestGameLoader(instance);
    setTestDatabase(new InMemoryDatabase());
    instance.resetForTesting();
  });

  afterEach(() => {
    restoreTestDatabase();
    restoreTestGameLoader();
  });

  it('restores the solar phase when a saved game is loaded from the database', async () => {
    const [game] = testGame(2, {solarPhaseOption: true});
    // Generation 1 without corporations is restored through the initial-research path, so use a
    // game that has already started.
    game.generation = 5;
    game.phase = Phase.SOLAR;

    await instance.saveGame(game);
    // saveGame() only writes to the database; add() registers the id so getGame(forceLoad) can
    // read it back through the normal loader path.
    await instance.add(game);
    const loaded = await instance.getGame(game.id, /* forceLoad */ true);

    expect(loaded).is.not.undefined;
    expect(loaded!.phase).eq(Phase.SOLAR);
    const waitingFor = loaded!.first.getWaitingFor();
    expect(waitingFor).is.an.instanceof(OrOptions);
    expect((waitingFor as OrOptions).options.length).greaterThan(0);
  });

  it('restores the intergeneration phase without incrementing the generation twice', async () => {
    const [game] = testGame(2);
    // startGeneration() increments the counter before it moves on to drafting or research, so a
    // game persisted in this phase already carries the new generation number.
    const generation = 7;
    game.generation = generation;
    game.phase = Phase.INTERGENERATION;

    await instance.saveGame(game);
    await instance.add(game);
    const loaded = await instance.getGame(game.id, /* forceLoad */ true);

    expect(loaded).is.not.undefined;
    expect(loaded!.generation).eq(generation);
    expect([Phase.RESEARCH, Phase.DRAFTING]).includes(loaded!.phase);
  });
});
