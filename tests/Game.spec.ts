import * as constants from '../src/common/constants';
import {expect} from 'chai';
import {Game} from '../src/server/Game';
import {Mayor} from '../src/server/milestones/Mayor';
import {Banker} from '../src/server/awards/Banker';
import {Thermalist} from '../src/server/awards/Thermalist';
import {Birds} from '../src/server/cards/base/Birds';
import {WaterImportFromEuropa} from '../src/server/cards/base/WaterImportFromEuropa';
import {Phase} from '../src/common/Phase';
import {addCity, addGreenery, addOcean, forceGenerationEnd, maxOutOceans, runAllActions, setOxygenLevel, setTemperature, setVenusScaleLevel} from './TestingUtils';
import {cast, toName} from '../src/common/utils/utils';
import {TestPlayer} from './TestPlayer';
import {SaturnSystems} from '../src/server/cards/corporation/SaturnSystems';
import {Resource} from '../src/common/Resource';
import {Space} from '../src/server/boards/Space';
import {SpaceId} from '../src/common/Types';
import {ArcticAlgae} from '../src/server/cards/base/ArcticAlgae';
import {Ecologist} from '../src/server/milestones/Ecologist';
import {OrOptions} from '../src/server/inputs/OrOptions';
import {BoardName} from '../src/common/boards/BoardName';
import {CardName} from '../src/common/cards/CardName';
import {Player} from '../src/server/Player';
import {RandomMAOptionType} from '../src/common/ma/RandomMAOptionType';
import {SpaceBonus} from '../src/common/boards/SpaceBonus';
import {TileType} from '../src/common/TileType';
import {IColony} from '../src/server/colonies/IColony';
import {IAward} from '../src/server/awards/IAward';
import {SerializedGame} from '../src/server/SerializedGame';
import {SelectInitialCards} from '../src/server/inputs/SelectInitialCards';
import {SelectSpace} from '../src/server/inputs/SelectSpace';
import {GlobalParameter} from '../src/common/GlobalParameter';
import {assertPlaceOcean} from './assertions';
import {TiredEarth} from '../src/server/cards/pathfinders/TiredEarth';
import {Tag} from '../src/common/cards/Tag';
import {restoreTestDatabase, restoreTestGameLoader, setTestDatabase, setTestGameLoader} from './testing/setup';
import {InMemoryDatabase} from './testing/InMemoryDatabase';
import {IGame, Score} from '../src/server/IGame';
import {IGameLoader} from '../src/server/database/IGameLoader';
import {ColonyName} from '../src/common/colonies/ColonyName';
import {Ceres} from '../src/server/colonies/Ceres';
import {Triton} from '../src/server/colonies/Triton';
import {captureEarlyGameStats} from '../src/server/game/EarlyGameStats';

function noopGameLoader(): IGameLoader {
  return {
    add: () => Promise.resolve(),
    getIds: () => Promise.resolve([]),
    getLastSaveTimeMs: () => Promise.resolve(undefined),
    getLastSaveTimesMs: () => Promise.resolve(new Map()),
    getGame: () => Promise.resolve(undefined),
    getGameAt: () => Promise.reject(new Error('not implemented')),
    getGameAtOrBefore: () => Promise.reject(new Error('not implemented')),
    restoreGameAt: () => Promise.reject(new Error('not implemented')),
    mark: () => {},
    saveGame: () => Promise.resolve(),
    completeGame: () => Promise.resolve(),
    maintenance: () => Promise.resolve(),
  };
}

describe('Game', () => {
  it('delegates a normal save once and stores the returned Promise', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const saveGamePromise = Promise.resolve();
    const savedGames: Array<IGame> = [];
    const game = Game.newInstance(
      'game-save-port',
      [player],
      player,
      'spectatorid',
      {},
      0,
      (savedGame) => {
        savedGames.push(savedGame);
        return saveGamePromise;
      },
    );

    savedGames.length = 0;
    game.save();

    expect(savedGames).deep.eq([game]);
    expect(game.saveGamePromise).eq(saveGamePromise);
  });

  it('does not persist or replace the Promise in simulation mode', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const savedGames: Array<IGame> = [];
    const game = Game.newInstance(
      'game-save-port-simulation',
      [player],
      player,
      'spectatorid',
      {},
      0,
      (savedGame) => {
        savedGames.push(savedGame);
        return Promise.resolve();
      },
    );

    savedGames.length = 0;
    const previousSaveGamePromise = game.saveGamePromise;
    game.simulationMode = true;
    game.save();

    expect(savedGames).is.empty;
    expect(game.saveGamePromise).eq(previousSaveGamePromise);
  });

  it('should initialize with right defaults', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid');
    expect(game.gameOptions.corporateEra).is.true;
    expect(game.getGeneration()).to.eq(1);
  });

  it('does not show a purge time for async turn-based games', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {turnBasedGame: true});

    expect(game.expectedPurgeTimeMs()).eq(0);
  });

  it('restores legacy async games that stored telegram players without turnBasedGame', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {turnBasedGame: true});
    player.telegramID = '123456';
    const serialized = game.serialize();
    delete (serialized.gameOptions as Partial<typeof serialized.gameOptions>).turnBasedGame;
    delete (serialized.gameOptions as Partial<typeof serialized.gameOptions>).privateHands;

    const restored = Game.deserialize(serialized);

    expect(restored.gameOptions.turnBasedGame).is.true;
    expect(restored.gameOptions.privateHands).is.true;
  });

  it('keeps explicitly non-async games non-async when a telegram id is stale', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {turnBasedGame: false});
    player.telegramID = '123456';

    const restored = Game.deserialize(game.serialize());

    expect(restored.gameOptions.turnBasedGame).is.false;
  });

  it('does not show a purge time when unfinished game purge is disabled', () => {
    const maxGameDays = process.env.MAX_GAME_DAYS;
    delete process.env.MAX_GAME_DAYS;
    try {
      const player = TestPlayer.BLUE.newPlayer();
      const player2 = TestPlayer.RED.newPlayer();
      const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid');

      expect(game.expectedPurgeTimeMs()).eq(0);
    } finally {
      if (maxGameDays === undefined) {
        delete process.env.MAX_GAME_DAYS;
      } else {
        process.env.MAX_GAME_DAYS = maxGameDays;
      }
    }
  });

  it('shows a purge time when unfinished game purge is configured', () => {
    const maxGameDays = process.env.MAX_GAME_DAYS;
    process.env.MAX_GAME_DAYS = '2';
    try {
      const before = Date.now() + (2 * 86400 * 1000);
      const player = TestPlayer.BLUE.newPlayer();
      const player2 = TestPlayer.RED.newPlayer();
      const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid');
      const after = Date.now() + (2 * 86400 * 1000);

      expect(game.expectedPurgeTimeMs()).gte(before);
      expect(game.expectedPurgeTimeMs()).lte(after);
    } finally {
      if (maxGameDays === undefined) {
        delete process.env.MAX_GAME_DAYS;
      } else {
        process.env.MAX_GAME_DAYS = maxGameDays;
      }
    }
  });

  it('sets starting production if corporate era not selected', () => {
    const player = TestPlayer.BLUE.newPlayer();

    Game.newInstance('gameid', [player], player, 'spectatorid', {corporateEra: false});
    expect(player.production.megacredits).to.eq(1);
    expect(player.production.steel).to.eq(1);
    expect(player.production.titanium).to.eq(1);
    expect(player.production.plants).to.eq(1);
    expect(player.production.energy).to.eq(1);
    expect(player.production.heat).to.eq(1);
  });

  it('correctly calculates victory points', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const player3 = TestPlayer.YELLOW.newPlayer();
    const game = Game.newInstance('gameid', [player, player2, player3], player, 'spectatorid');

    addCity(player, '29');
    addGreenery(player, '21');

    // Claim milestone
    const milestone = new Mayor();

    game.claimedMilestones.push({
      player: player,
      milestone: milestone,
    });

    // Fund awards
    let award: IAward = new Banker();
    game.fundAward(player, award);

    // Set second player to win Banker award
    player2.production.add(Resource.MEGACREDITS, 10);

    // Our testing player will be 2nd Banker in the game
    player.production.add(Resource.MEGACREDITS, 7);

    // Two other players will share Thermalist award
    award = new Thermalist();
    game.fundAward(player, award);

    player2.heat = 23;
    player3.heat = 23;

    // Add some cards with VPs
    const birdsCard = new Birds();
    birdsCard.resourceCount += 6;
    player.playedCards.push(birdsCard);

    player2.playedCards.push(new WaterImportFromEuropa());

    // Finish the game
    game.playerIsDoneWithGame(player3);
    game.playerIsDoneWithGame(player2);
    game.playerIsDoneWithGame(player);

    const player1VPs = player.getVictoryPoints();
    const player2VPs = player2.getVictoryPoints();
    const player3VPs = player3.getVictoryPoints();

    expect(player1VPs.terraformRating).to.eq(21);
    expect(player1VPs.milestones).to.eq(5);
    expect(player1VPs.awards).to.eq(2); // one 2nd place
    expect(player1VPs.greenery).to.eq(1);
    expect(player1VPs.city).to.eq(1); // greenery adjacent to city
    expect(player1VPs.victoryPoints).to.eq(6);
    expect(player1VPs.total).to.eq(36);

    expect(player2VPs.awards).to.eq(10); // 1st place + one shared 1st place
    expect(player3VPs.awards).to.eq(5); // one shared 1st place
  });

  it('Disallows to set temperature more than allowed maximum', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid');

    setTemperature(game, 6);
    let initialTR = player.terraformRating;
    game.increaseTemperature(player, 2);

    expect(game.getTemperature()).to.eq(constants.MAX_TEMPERATURE);
    expect(player.terraformRating).to.eq(initialTR + 1);

    initialTR = player.terraformRating;
    setTemperature(game, 6);

    // Try 3 steps increase
    game.increaseTemperature(player, 3);
    expect(game.getTemperature()).to.eq(constants.MAX_TEMPERATURE);
    expect(player.terraformRating).to.eq(initialTR + 1);
  });

  it('Disallows to set oxygenLevel more than allowed maximum', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, player2], player, 'spectatorid');

    setOxygenLevel(game, 13);
    const initialTR = player.terraformRating;
    game.increaseOxygenLevel(player, 2);

    expect(game.getOxygenLevel()).to.eq(constants.MAX_OXYGEN_LEVEL);
    expect(player.terraformRating).to.eq(initialTR + 1);
  });

  it('Draft round for 2 players', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-draft', [player, player2], player, 'spectatorid');
    game.generation = 4;
    game.playerHasPassed(player);
    game.playerIsFinishedTakingActions();
    game.playerHasPassed(player2);
    game.playerIsFinishedTakingActions();
    expect(game.getGeneration()).to.eq(5);
  });

  it('No draft round for 2 players', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-classic', [player, player2], player, 'spectatorid');
    game.generation = 2;
    game.playerHasPassed(player);
    game.playerIsFinishedTakingActions();
    game.playerHasPassed(player2);
    game.playerIsFinishedTakingActions();
    expect(game.getGeneration()).to.eq(3);
  });

  it('Solo play next generation', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-solo', [player], player, 'spectatorid');
    game.playerHasPassed(player);
    game.playerIsFinishedTakingActions();
    expect(game.getGeneration()).to.eq(2);
  });

  it('Should not finish game before Venus is terraformed, if chosen', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-venusterraform', [player, player2], player, 'spectatorid', {venusNextExtension: true, requiresVenusTrackCompletion: true});
    setTemperature(game, constants.MAX_TEMPERATURE);
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    // setVenusScaleLevel(game, constants.MAX_VENUS_SCALE);
    setVenusScaleLevel(game, 6);
    maxOutOceans(player);
    // Skip final greenery Phase
    player.plants = 0;
    player2.plants = 0;
    // Pass last turn
    game.playerHasPassed(player);
    game.playerHasPassed(player2);
    game.playerIsFinishedTakingActions();
    // Now game should be in research state
    expect(game.phase).to.eq(Phase.RESEARCH);
  });

  it('Should finish game if Mars and Venus is terraformed, if chosen', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-venusterraform', [player, player2], player, 'spectatorid', {venusNextExtension: true, requiresVenusTrackCompletion: true});
    setTemperature(game, constants.MAX_TEMPERATURE);
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    setVenusScaleLevel(game, constants.MAX_VENUS_SCALE);
    maxOutOceans(player);
    // Skip final greenery Phase
    player.plants = 0;
    player2.plants = 0;
    // Pass last turn
    game.playerHasPassed(player);
    game.playerHasPassed(player2);

    // Must remove waitingFor or playerIsFinishedTakingActions
    // will pre-emptively exit -- you can't end the game
    // if the game is waiting for a player to do something!
    player.popWaitingFor();
    player2.popWaitingFor();
    game.playerIsFinishedTakingActions();
    // Now game should be in end state
    expect(game.phase).to.eq(Phase.END);
  });

  it('Should not finish game if Mars is not terraformed but Venus is terraformed, if chosen', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-venusterraform', [player, player2], player, 'spectatorid', {venusNextExtension: true, requiresVenusTrackCompletion: true});
    setTemperature(game, 2);
    setOxygenLevel(game, 2);
    setVenusScaleLevel(game, constants.MAX_VENUS_SCALE);
    maxOutOceans(player);
    // Skip final greenery Phase
    player.plants = 0;
    player2.plants = 0;
    // Pass last turn
    game.playerHasPassed(player);
    game.playerHasPassed(player2);
    game.playerIsFinishedTakingActions();
    // Now game should be in research state
    expect(game.phase).to.eq(Phase.RESEARCH);
  });

  it('Should finish solo game in the end of last generation', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-solo1', [player], player, 'spectatorid');
    game.playerIsDoneWithGame(player);

    // Now game should be in finished state
    expect(game.phase).to.eq(Phase.END);

    expect(game.isSoloModeWin()).is.not.true;
  });

  it('Should not finish solo game before last generation if Mars is already terraformed', () => {
    const player = TestPlayer.BLUE.newPlayer();

    const game = Game.newInstance('game-solo2', [player], player, 'spectatorid');
    game.generation = 10;

    // Terraform
    setTemperature(game, constants.MAX_TEMPERATURE);
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    maxOutOceans(player);

    player.plants = 0; // Skip final greenery Phase

    // Pass last turn
    game.playerHasPassed(player);

    // Now game should be in research state
    expect(game.phase).to.eq(Phase.RESEARCH);
  });

  it('Solo player should place final greeneries if victory condition met', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-solo2', [player], player, 'spectatorid');
    /* Removes SelectInitialCards. The cast verifies that it's popping the right thing. */
    cast(player.popWaitingFor(), SelectInitialCards);

    // Set up end-game conditions
    game.generation = 14;
    setTemperature(game, constants.MAX_TEMPERATURE);
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    maxOutOceans(player);
    player.plants = 9;

    // Pass last turn
    forceGenerationEnd(game);

    // Final greenery placement is considered part of the production phase.
    expect(game.phase).to.eq(Phase.PRODUCTION);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.title).eq('Place any final greenery from plants');
  });

  it('Solo player should not place final greeneries if victory condition not met', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-solo2', [player], player, 'spectatorid');

    // Set up near end-game conditions
    game.generation = 14;
    setTemperature(game, constants.MAX_TEMPERATURE - 2);
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    maxOutOceans(player);
    player.plants = 9;

    // Pass last turn
    forceGenerationEnd(game);

    // Now game should be over
    expect(game.phase).to.eq(Phase.END);
  });

  it('Solo player should place final greeneries in TR 63 mode if victory condition is met', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-solo2', [player], player, 'spectatorid', {soloTR: true});
    /* Removes SelectInitialCards. The cast verifies that it's popping the right thing. */
    cast(player.popWaitingFor(), SelectInitialCards);

    // Set up end-game conditions
    game.generation = 14;
    player.setTerraformRating(63);
    player.plants = 9;

    // Pass last turn
    forceGenerationEnd(game);

    // Final greenery placement is considered part of the production phase.
    expect(game.phase).to.eq(Phase.PRODUCTION);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.title).eq('Place any final greenery from plants');
  });

  it('Solo player should not place final greeneries in TR63 mode if victory condition not met', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-solo2', [player], player, 'spectatorid', {soloTR: true});

    // Set up near end-game conditions
    game.generation = 14;
    player.setTerraformRating(62);
    player.plants = 9;

    // Pass last turn
    forceGenerationEnd(game);

    // Now game should be over
    expect(game.phase).to.eq(Phase.END);
  });

  it('Should not give TR or raise oxygen for final greenery placements', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const otherPlayer = TestPlayer.RED.newPlayer();

    const game = Game.newInstance('gameid', [player, otherPlayer], player, 'spectatorid');
    game.generation = 14;

    // Terraform
    setTemperature(game, constants.MAX_TEMPERATURE);
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL - 2);
    maxOutOceans(player);

    // Must remove waitingFor or playerIsFinishedTakingActions
    // will pre-emptively exit -- you can't end the game
    // if the game is waiting for a player to do something!
    player.popWaitingFor();
    otherPlayer.popWaitingFor();

    // Trigger end game
    player.setTerraformRating(20);
    player.plants = 14;
    player.takeActionForFinalGreenery();

    // Place first greenery to get 2 plants
    const placeFirstGreenery = cast(player.getWaitingFor(), OrOptions);
    const arsiaMons = game.board.getSpaceOrThrow('29');
    placeFirstGreenery.options[0].cb(arsiaMons);
    expect(player.plants).to.eq(8);

    // Place second greenery
    const placeSecondGreenery = cast(player.getWaitingFor(), OrOptions);
    const otherSpace = game.board.getSpaceOrThrow('30');
    placeSecondGreenery.options[0].cb(otherSpace);

    // End the game
    game.playerHasPassed(player);
    game.playerIsDoneWithGame(player);
    expect(game.phase).to.eq(Phase.END);
    expect(game.isSoloModeWin()).is.not.true;

    // Don't give TR or raise oxygen for final greenery placements
    expect(player.terraformRating).to.eq(20);
    expect(game.getOxygenLevel()).to.eq(12);
  });

  it('saves final score snapshot fields needed to resolve equal VP by megacredits', async () => {
    const alice = TestPlayer.BLUE.newPlayer({name: 'Alice'});
    const bob = TestPlayer.RED.newPlayer({name: 'Bob'});
    alice.user = 'alice-user';
    bob.user = 'bob-user';
    const game = Game.newInstance('g-score-snapshot-game', [alice, bob], alice, 'spectatorid');
    game.generation = 10;
    alice.setTerraformRating(80);
    bob.setTerraformRating(80);
    alice.megaCredits = 12;
    bob.megaCredits = 30;

    let savedScores: Array<Score> = [];
    const database = new InMemoryDatabase();
    database.saveGameResults = (_gameId, _players, _generations, _gameOptions, scores) => {
      savedScores = scores;
    };
    setTestDatabase(database);
    setTestGameLoader(noopGameLoader());

    try {
      await (game as unknown as {gotoEndGame: () => Promise<void>}).gotoEndGame();
    } finally {
      restoreTestGameLoader();
      restoreTestDatabase();
    }

    const snapshot = savedScores as Array<Score & {
      megacredits?: number;
      place?: number;
      playerName?: string;
      user?: string;
    }>;
    expect(snapshot.map((score) => ({
      playerName: score.playerName,
      user: score.user,
      playerScore: score.playerScore,
      place: score.place,
      megacredits: score.megacredits,
    }))).deep.eq([
      {playerName: 'Bob', user: 'bob-user', playerScore: 80, place: 1, megacredits: 30},
      {playerName: 'Alice', user: 'alice-user', playerScore: 80, place: 2, megacredits: 12},
    ]);
  });

  it('captures generation 1 and 2 cards, colonies, and production in the final score', async () => {
    const player = TestPlayer.BLUE.newPlayer({name: 'Alice'});
    const otherPlayer = TestPlayer.RED.newPlayer({name: 'Bob'});
    const game = Game.newInstance('g-early-stats-game', [player, otherPlayer], player, 'spectatorid');
    const ceres = new Ceres();
    const triton = new Triton();
    game.colonies = [ceres, triton];

    player.playedCards.push(new Birds());
    ceres.colonies.push(player.id);
    player.production.add(Resource.MEGACREDITS, 5);
    player.production.add(Resource.ENERGY, 2);
    game.generation = 1;
    captureEarlyGameStats(game);

    player.playedCards.push(new WaterImportFromEuropa());
    triton.colonies.push(player.id);
    player.production.add(Resource.STEEL, 1);
    game.generation = 2;
    captureEarlyGameStats(game);

    expect(player.earlyGameStats).deep.eq({
      version: 1,
      1: {
        complete: true,
        projectCards: [CardName.BIRDS],
        colonies: [ColonyName.CERES],
        production: {megacredits: 5, steel: 0, titanium: 0, plants: 0, energy: 2, heat: 0},
      },
      2: {
        complete: true,
        projectCards: [CardName.WATER_IMPORT_FROM_EUROPA],
        colonies: [ColonyName.TRITON],
        production: {megacredits: 5, steel: 1, titanium: 0, plants: 0, energy: 2, heat: 0},
      },
    });
    expect(Game.deserialize(game.serialize()).players[0].earlyGameStats).deep.eq(player.earlyGameStats);

    let savedScores: Array<Score> = [];
    const database = new InMemoryDatabase();
    database.saveGameResults = (_gameId, _players, _generations, _gameOptions, scores) => {
      savedScores = scores;
    };
    setTestDatabase(database);
    setTestGameLoader(noopGameLoader());
    try {
      await (game as unknown as {gotoEndGame: () => Promise<void>}).gotoEndGame();
    } finally {
      restoreTestGameLoader();
      restoreTestDatabase();
    }

    const aliceScore = savedScores.find((score) => score.playerName === 'Alice');
    expect(aliceScore?.earlyGameStats).deep.eq(player.earlyGameStats);
  });

  it('marks generation 2 card and colony stats incomplete when generation 1 was not captured', () => {
    const player = TestPlayer.BLUE.newPlayer({name: 'Legacy player'});
    const game = Game.newInstance('g-legacy-early-stats', [player], player, 'spectatorid');
    player.playedCards.push(new Birds());
    player.production.add(Resource.ENERGY, 2);
    game.generation = 2;

    captureEarlyGameStats(game);

    expect(player.earlyGameStats[2]).deep.eq({
      complete: false,
      projectCards: [],
      colonies: [],
      production: {megacredits: 0, steel: 0, titanium: 0, plants: 0, energy: 2, heat: 0},
    });
  });

  it('does not persist results or saves when a simulation game ends', async () => {
    const player = TestPlayer.BLUE.newPlayer({name: 'Simulation player'});
    const game = Game.newInstance('g-simulation-end', [player], player, 'spectatorid');
    game.simulationMode = true;

    let savedResults = false;
    const database = new InMemoryDatabase();
    database.saveGameResults = () => {
      savedResults = true;
    };
    let savedGame = false;
    let completedGame = false;
    const gameLoader = noopGameLoader();
    gameLoader.saveGame = () => {
      savedGame = true;
      return Promise.resolve();
    };
    gameLoader.completeGame = () => {
      completedGame = true;
      return Promise.resolve();
    };
    setTestDatabase(database);
    setTestGameLoader(gameLoader);

    try {
      await (game as unknown as {gotoEndGame: () => Promise<void>}).gotoEndGame();
    } finally {
      restoreTestGameLoader();
      restoreTestDatabase();
    }

    expect(game.phase).eq(Phase.END);
    expect(savedResults).eq(false);
    expect(savedGame).eq(false);
    expect(completedGame).eq(false);
  });

  it('Final greenery placement in order of the current generation', () => {
    const player1 = new TestPlayer('blue');
    const player2 = new TestPlayer('green');
    const player3 = new TestPlayer('yellow');
    const player4 = new TestPlayer('red');
    const game = Game.newInstance('gto', [player1, player2, player3, player4], player3, 'spectatorid');

    [player1, player2, player3, player4].forEach((p) => {
      p.popWaitingFor();
      p.plants = 8;
    });

    game.takeNextFinalGreeneryAction();

    cast(player1.getWaitingFor(), undefined);
    cast(player2.getWaitingFor(), undefined);
    expect(player3.getWaitingFor()).is.not.undefined;
    cast(player4.getWaitingFor(), undefined);

    // Skipping plants placement. Option 1 is "Don't place plants".
    // This weird input is what would come from the server, and indicates "Don't place plants".
    player3.process({type: 'or', index: 1, response: {type: 'option'}});

    cast(player1.getWaitingFor(), undefined);
    cast(player2.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);
    expect(player4.getWaitingFor()).is.not.undefined;

    player4.process({type: 'or', index: 1, response: {type: 'option'}});

    expect(player1.getWaitingFor()).is.not.undefined;
    cast(player2.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);
    cast(player4.getWaitingFor(), undefined);

    player1.process({type: 'or', index: 1, response: {type: 'option'}});

    cast(player1.getWaitingFor(), undefined);
    expect(player2.getWaitingFor()).is.not.undefined;
    cast(player3.getWaitingFor(), undefined);
    cast(player4.getWaitingFor(), undefined);

    player2.process({type: 'or', index: 1, response: {type: 'option'}});

    cast(player1.getWaitingFor(), undefined);
    cast(player2.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);
    cast(player4.getWaitingFor(), undefined);

    expect(game.phase).eq(Phase.END);
  });

  it('Final greenery placement skips players without enough plants', () => {
    const player1 = new TestPlayer('blue');
    const player2 = new TestPlayer('green');
    const player3 = new TestPlayer('yellow');
    const player4 = new TestPlayer('red');
    const game = Game.newInstance('gto', [player1, player2, player3, player4], player2, 'spectatorid');
    game.incrementFirstPlayer();

    [player1, player2, player3, player4].forEach((p) => {
      p.popWaitingFor();
    });

    player1.plants = 8;
    player4.plants = 8;

    game.takeNextFinalGreeneryAction();

    // Even though player 3 is first player, they have no plants. So player 4 goes.

    cast(player1.getWaitingFor(), undefined);
    cast(player2.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);
    expect(player4.getWaitingFor()).is.not.undefined;

    // Skipping plants placement. Option 1 is "Don't place plants".
    // This weird input is what would come from the server, and indicates "Don't place plants".
    player4.process({type: 'or', index: 1, response: {type: 'option'}});

    // After that, player 1 has plants.
    expect(player1.getWaitingFor()).is.not.undefined;
    cast(player2.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);
    cast(player4.getWaitingFor(), undefined);

    player1.process({type: 'or', index: 1, response: {type: 'option'}});

    // But player 2 doesn't, and so the game is over.
    expect(game.phase).eq(Phase.END);
  });

  it('Final greenery placement is saved after each player', async () => {
    try {
      const db = new InMemoryDatabase();
      setTestDatabase(db);

      const player1 = new TestPlayer('blue');
      const player2 = new TestPlayer('green');
      let game = Game.newInstance('gto', [player1, player2], player1, 'spectatorid');

      game.players.forEach((p) => {
        (p as TestPlayer).popWaitingFor();
        p.plants = 8;
      });

      // Set up end-game conditions
      game.generation = 14;
      setTemperature(game, constants.MAX_TEMPERATURE);
      setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
      maxOutOceans(player1);
      player1.plants = 8;

      // Pass last turn
      forceGenerationEnd(game);

      // Final greenery placement is considered part of the production phase.
      expect(game.phase).to.eq(Phase.PRODUCTION);

      expect(game.activePlayer.color).eq('blue');

      // Skipping plants placement. Option 1 is "Don't place plants".
      // This weird input is what would come from the server, and indicates "Don't place plants".
      player1.process({type: 'or', index: 1, response: {type: 'option'}});

      expect(game.activePlayer.color).eq('green');

      const serialized = await db.getGame(game.id);
      game = Game.deserialize(serialized);

      expect(game.activePlayer.color).eq('green');

      const options = cast(game.activePlayer.getWaitingFor(), OrOptions);
      expect(options.options[0].title).eq('Select space for greenery tile');
      expect(options.options[1].title).eq('Don\'t place a greenery');
    } finally {
      restoreTestDatabase();
    }
  });

  it('Should return players in turn order', () => {
    const player1 = new Player('p1', 'blue', false, 0, 'p1-id');
    const player2 = new Player('p2', 'green', false, 0, 'p2-id');
    const player3 = new Player('p3', 'yellow', false, 0, 'p3-id');
    const player4 = new Player('p4', 'red', false, 0, 'p4-id');
    const game = Game.newInstance('gto', [player1, player2, player3, player4], player3, 'spectatorid');

    expect(game.playersInGenerationOrder.map(toName)).deep.eq(['p3', 'p4', 'p1', 'p2']);

    game.incrementFirstPlayer();
    expect(game.playersInGenerationOrder.map(toName)).deep.eq(['p4', 'p1', 'p2', 'p3']);

    game.incrementFirstPlayer();
    expect(game.playersInGenerationOrder.map(toName)).deep.eq(['p1', 'p2', 'p3', 'p4']);

    game.incrementFirstPlayer();
    expect(game.playersInGenerationOrder.map(toName)).deep.eq(['p2', 'p3', 'p4', 'p1']);

    game.incrementFirstPlayer();
    expect(game.playersInGenerationOrder.map(toName)).deep.eq(['p3', 'p4', 'p1', 'p2']);
  });

  it('Gets card player for corporation card', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gto', [player], player, 'spectatorid');
    const card = new SaturnSystems();
    player.playedCards.push(card);
    expect(game.getCardPlayerOrThrow(card.name)).to.eq(player);
  });

  it('Does not assign player to ocean after placement', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-oceanz', [player], player, 'spectatorid');
    const spaceId: SpaceId = game.board.getAvailableSpacesForOcean(player)[0].id;
    addOcean(player, spaceId);

    const space: Space = game.board.getSpaceOrThrow(spaceId);
    expect(space.player).is.undefined;
  });

  it('Check Ecologist Milestone', () => {
    const player = TestPlayer.BLUE.newPlayer();

    const ecologist = new Ecologist();

    player.tagsForTest = {plant: 1, microbe: 1};
    expect(ecologist.canClaim(player)).is.not.true;
    player.tagsForTest = {plant: 1, microbe: 1, wild: 2};
    expect(ecologist.canClaim(player)).is.true;
  });

  it('Generates random milestones and awards', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const gameOptions = {boardName: BoardName.HELLAS, randomMA: RandomMAOptionType.UNLIMITED};
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', gameOptions);

    const prevMilestones = game.milestones.map(toName).sort();
    const prevAwards = game.awards.map(toName).sort();

    const game2 = Game.newInstance('game-foobar2', [player, player2], player, 'spectatorid', gameOptions);

    const milestones = game2.milestones.map(toName).sort();
    const awards = game2.awards.map(toName).sort();

    expect(prevMilestones).to.not.eq(milestones);
    expect(prevAwards).to.not.eq(awards);
  });

  // https://github.com/terraforming-mars/terraforming-mars/issues/5572
  it('Milestones can be claimed', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {});
    player.popWaitingFor();

    player.setTerraformRating(35); // Can claim Terraformer milestone

    player.megaCredits = 7;
    // Cannot afford milestone.
    const actions = cast(player.getActions(), OrOptions);

    expect(actions.options.find((option) => option.title === 'Claim a milestone')).is.undefined;

    player.megaCredits = 8;
    const actions2 = cast(player.getActions(), OrOptions);
    const claimMilestoneAction = cast(actions2.options.find((option) => option.title === 'Claim a milestone'), OrOptions);
    claimMilestoneAction.options[0].cb();
    runAllActions(game);
    expect(game.claimedMilestones.some((cm) => cm.milestone.name === 'Terraformer' && cm.player === player)).is.true;
  });

  // https://github.com/terraforming-mars/terraforming-mars/issues/5572
  it('Milestones cannot be claimed twice', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {});
    player.popWaitingFor();

    player.setTerraformRating(35); // Can claim Terraformer milestone
    player.megaCredits = 8;
    const actions = cast(player.getActions(), OrOptions);
    const claimMilestoneAction = cast(actions.options.find((option) => option.title === 'Claim a milestone'), OrOptions);
    claimMilestoneAction.options[0].cb();
    runAllActions(game);
    expect(game.claimedMilestones.some((cm) => cm.milestone.name === 'Terraformer' && cm.player === player)).is.true;

    expect(() => claimMilestoneAction.options[0].cb()).to.throw(/Terraformer is already claimed/);
    const actions2 = cast(player.getActions(), OrOptions);
    expect(actions2.options.some((option) => option.title === 'Claim a milestone')).is.false;
  });

  it('filters specifically-requested corps from disabled expansions', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const corpsFromTurmoil = [
      CardName.LAKEFRONT_RESORTS,
      CardName.PRISTAR,
      CardName.TERRALABS_RESEARCH,
      CardName.UTOPIA_INVEST,
      CardName.SEPTUM_TRIBUS,
    ];
    const gameOptions = {customCorporationsList: corpsFromTurmoil, turmoilExtension: false};
    Game.newInstance('gameid', [player, player2], player, 'spectatorid', gameOptions);

    const corpsAssignedToPlayers =
            [...player.dealtCorporationCards, ...player2.dealtCorporationCards].map(toName);

    expect(corpsAssignedToPlayers).to.include(CardName.LAKEFRONT_RESORTS);
    expect(corpsAssignedToPlayers).to.include(CardName.UTOPIA_INVEST);
    expect(corpsAssignedToPlayers).to.not.include(CardName.PRISTAR);
    expect(corpsAssignedToPlayers).to.not.include(CardName.TERRALABS_RESEARCH);
    expect(corpsAssignedToPlayers).to.not.include(CardName.SEPTUM_TRIBUS);
  });

  it('filters specifically-requested preludes from disabled expansions', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const customPreludes = [
      CardName.ALLIED_BANK,
      CardName.BIOFUELS,
      CardName.CORPORATE_ARCHIVES,
      CardName.SURVEY_MISSION,
      CardName.HIGH_CIRCLES,
      CardName.VITAL_COLONY,
      CardName.STRATEGIC_BASE_PLANNING,
      CardName.EXPERIENCED_MARTIANS,
    ];
    const gameOptions = {
      preludeExtension: true,
      prelude2Expansion: false,
      customPreludes,
      pathfindersExpansion: false,
      promoCardsOption: false,
      coloniesExtension: false,
      turmoilExtension: false,
    };
    Game.newInstance('gameid', [player, player2], player, 'spectatorid', gameOptions);

    const assignedPreludes =
            [...player.dealtPreludeCards, ...player2.dealtPreludeCards].map(toName);

    expect(assignedPreludes).to.include(CardName.ALLIED_BANK);
    expect(assignedPreludes).to.include(CardName.BIOFUELS);
    expect(assignedPreludes).to.not.include(CardName.CORPORATE_ARCHIVES);
    expect(assignedPreludes).to.not.include(CardName.SURVEY_MISSION);
    expect(assignedPreludes).to.not.include(CardName.HIGH_CIRCLES);
    expect(assignedPreludes).to.not.include(CardName.VITAL_COLONY);
    expect(assignedPreludes).to.not.include(CardName.STRATEGIC_BASE_PLANNING);
    expect(assignedPreludes).to.not.include(CardName.EXPERIENCED_MARTIANS);
  });

  it('throws if Delta Project is in customPreludes', () => {
    const player = TestPlayer.BLUE.newPlayer();
    expect(() => Game.newInstance('gameid', [player], player, 'spectatorid', {
      deltaProjectExpansion: true,
      preludeExtension: true,
      customPreludes: [CardName.DELTA_PROJECT, CardName.ALLIED_BANK],
    })).to.throw();
  });

  it('throws if Delta Project is banned', () => {
    const player = TestPlayer.BLUE.newPlayer();
    expect(() => Game.newInstance('gameid', [player], player, 'spectatorid', {
      deltaProjectExpansion: true,
      bannedCards: [CardName.DELTA_PROJECT],
    })).to.throw();
  });

  it('fails when the same id appears in two players', () => {
    const player1 = new Player('name', 'blue', false, 0, 'p-id3');
    const player2 = new Player('name', 'red', false, 0, 'p-id3');
    expect(
      () => Game.newInstance('gameid', [player1, player2], player1, 'spectatorid'))
      .to.throw(Error, /Duplicate player found: \[p-id3,p-id3\]/);
  });

  it('fails when first player is absent from the list of players.', () => {
    expect(
      () => Game.newInstance('gameid', [TestPlayer.RED.newPlayer(), TestPlayer.BLUE.newPlayer()], TestPlayer.YELLOW.newPlayer(), 'spectatorid'))
      .to.throw(Error, /Cannot find first player/);
  });

  it('fails when the same color appears in two players', () => {
    const player1 = new Player('name', 'red', false, 0, 'p-id1');
    const player2 = new Player('name', 'red', false, 0, 'p-id2');
    expect(
      () => Game.newInstance('gameid', [player1, player2], player1, 'spectatorid'))
      .to.throw(Error, /Duplicate color found/);
  });

  it('grant space bonus sanity test', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid');
    const space = game.board.getAvailableSpacesOnLand(player)[0];

    space.bonus = [SpaceBonus.DRAW_CARD, SpaceBonus.DRAW_CARD, SpaceBonus.DRAW_CARD, SpaceBonus.DRAW_CARD, SpaceBonus.PLANT, SpaceBonus.TITANIUM];
    expect(player.cardsInHand).has.length(0);
    expect(player.plants).eq(0);
    expect(player.titanium).eq(0);

    game.addTile(player, space, {tileType: TileType.GREENERY});

    expect(player.cardsInHand).has.length(4);
    expect(player.plants).eq(1);
    expect(player.titanium).eq(1);
  });

  it('Ocean upgrade tiles can be placed on ocean spaces without Ares or Pathfinders', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('game-ocean-upgrade', [player], player, 'spectatorid');
    const oceanSpace = addOcean(player);

    // Placing an ocean city tile on top of an existing ocean should not throw,
    // even without Ares or Pathfinders expansion enabled.
    expect(() => {
      game.addTile(player, oceanSpace, {tileType: TileType.NEW_HOLLAND});
    }).to.not.throw();
    expect(oceanSpace.tile!.tileType).to.eq(TileType.NEW_HOLLAND);
  });

  /**
   * ensure as we modify properties we consider
   * serialization. if this fails update SerializedGame
   * to match
   */
  it('serializes properties', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid');
    game.monsInsuranceOwner = undefined;
    game.syndicatePirateRaider = undefined;
    game.moonData = undefined;
    game.pathfindersData = undefined;
    const serialized = game.serialize();
    assertIsJSON(serialized);
    const serializedKeys = Object.keys(serialized);

    const unserializedFieldsInGame: Array<keyof Game> = [
      'actionReplayState',
      'createdTime',
      'discardedColonies',
      'inDoubleDown',
      'inputsThisRound',
      'inTurmoil',
      'playersInGenerationOrder',
      'monsInsuranceOwner',
      'resettable',
      'rng',
      'saveGame',
      'saveGamePromise',
      'simulationMode',
      'underworldDraftEnabled',
      'doubleDownPrelude',
    ];
    const serializedValuesNotInGame: Array<keyof SerializedGame> = [
      'seed',
      'currentSeed',
      'createdTimeMs'];

    const gameKeys = Object.keys(game);

    for (const field of unserializedFieldsInGame) {
      expect(serializedKeys).does.not.include(field);
      expect(gameKeys).does.include(field);
    }
    for (const field of serializedValuesNotInGame) {
      expect(gameKeys).does.not.include(field);
      expect(serializedKeys).does.include(field);
    }

    expect(serializedKeys.concat(...unserializedFieldsInGame).sort())
      .deep.eq(gameKeys.concat(...serializedValuesNotInGame).sort());
  });

  it('persists bot tracking state across game restore', () => {
    const bot = TestPlayer.BLUE.newPlayer();
    const human = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [bot, human], bot, 'spectatorid');
    game.setBotPlayerIds([bot.id]);
    game.botTakeoverPlayerIds.add(human.id);

    const restored = Game.deserialize(game.serialize(), {simulation: true});

    expect(Array.from(restored.botPlayerIds)).deep.eq([bot.id]);
    expect(Array.from(restored.botTakeoverPlayerIds)).deep.eq([human.id]);
  });

  it('enables action undo when loading a game with experimental step undo', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid');
    const serialized = game.serialize();
    serialized.gameOptions.undoOption = false;
    serialized.gameOptions.undoStepOption = true;

    const restored = Game.deserialize(serialized, {simulation: true});
    const restoredPlayer = restored.getPlayerById(player.id);
    restored.phase = Phase.ACTION;
    restored.activePlayer = restoredPlayer;
    restoredPlayer.actionsTakenThisRound = 1;
    restoredPlayer.takeAction(false);

    expect(restored.gameOptions.undoOption).is.true;
    const waitingFor = restoredPlayer.getWaitingFor()?.toModel(restoredPlayer);
    expect(waitingFor?.type).eq('or');
    if (waitingFor?.type !== 'or') {
      throw new Error('Expected main action prompt');
    }
    expect(waitingFor.options.map((option) => option.title)).to.include('Undo last action');
  });

  it('deserializing a game without moon data still loads', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {moonExpansion: false});
    const serialized = game.serialize();
    delete serialized['moonData'];
    const deserialized = Game.deserialize(serialized);
    expect(deserialized.moonData).is.undefined;
  });

  it('serializes and deserializes shadowInputSeq', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid');
    game.shadowInputSeq = 7;

    const serialized = game.serialize();
    const deserialized = Game.deserialize(serialized);

    expect(serialized.shadowInputSeq).eq(7);
    expect(deserialized.shadowInputSeq).eq(7);
  });

  it('deserializing a game without pathfinders still loads', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {pathfindersExpansion: false});
    const serialized = game.serialize();
    (serialized.gameOptions as any).pathfindersData = undefined;
    const deserialized = Game.deserialize(serialized);
    expect(deserialized.pathfindersData).is.undefined;
  });

  it('deserializing a game migrates moon-logistics to moon-logistic', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {moonExpansion: true});
    const serialized = game.serialize();
    serialized.globalsPerGeneration = [
      {'moon-logistics': 3, 'moon-habitat': 1} as any,
      {'moon-mining': 2},
    ];
    const deserialized = Game.deserialize(serialized);
    expect(deserialized.globalsPerGeneration).deep.eq([
      {'moon-logistic': 3, 'moon-habitat': 1},
      {'moon-mining': 2},
    ]);
  });

  it('deserializing a game with awards', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {pathfindersExpansion: false});
    const scientist = game.awards.find((award) => award.name === 'Scientist')!;
    game.fundedAwards.push({
      award: scientist,
      player: player,
    });
    const serialized = game.serialize();
    expect(serialized.fundedAwards).deep.eq([{
      name: 'Scientist',
      playerId: 'p-blue-id',
    }]);
    const deserialized = Game.deserialize(serialized);
    expect(deserialized.awards).deep.eq(game.awards);
    expect(deserialized.fundedAwards).has.length(1);
    expect(deserialized.fundedAwards[0].award.name).eq('Scientist');
    expect(deserialized.fundedAwards[0].player.id).eq('p-blue-id');
  });

  // it('deserializing a game with renamed awards', () => {
  //   const player = TestPlayer.BLUE.newPlayer();
  //   const player2 = TestPlayer.RED.newPlayer();
  //   const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid');
  //   const engineer = new AmazonisEngineer();

  //   game.awards.unshift(engineer);

  //   game.fundedAwards.push({
  //     award: engineer,
  //     player: player,
  //   });

  //   const serialized = game.serialize();
  //   expect(serialized.awards[0]).eq('A. Engineer');
  //   expect(serialized.fundedAwards[0].name).eq('A. Engineer');

  //   serialized.awards[0] = 'Engineer' as any;
  //   serialized.fundedAwards[0].name = 'Engineer' as any;

  //   const deserialized = Game.deserialize(serialized);
  //   expect(deserialized.awards[0]).deep.eq(engineer);
  //   expect(deserialized.fundedAwards).has.length(1);
  //   expect(deserialized.fundedAwards[0].award.name).eq('A. Engineer');
  //   expect(deserialized.fundedAwards[0].player.id).eq('p-blue-id');
  // });

  // https://github.com/terraforming-mars/terraforming-mars/issues/5572
  it('dealing with awards accidentally funded twice', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {pathfindersExpansion: false});
    const scientist = game.awards.find((award) => award.name === 'Scientist')!;

    game.fundedAwards.push({
      award: scientist,
      player: player,
    });

    game.fundedAwards.push({
      award: scientist,
      player: player,
    });

    const serialized = game.serialize();
    // Serializing both of these isn't great, but it's how it works, and demonstrates how the
    // duplication goes away during deserialization
    expect(serialized.fundedAwards).deep.eq([{
      name: 'Scientist',
      playerId: 'p-blue-id',
    },
    {
      name: 'Scientist',
      playerId: 'p-blue-id',
    }]);

    const deserialized = Game.deserialize(serialized);
    expect(deserialized.fundedAwards).has.length(1);
    expect(deserialized.fundedAwards[0].award.name).eq('Scientist');
    expect(deserialized.fundedAwards[0].player.id).eq('p-blue-id');
  });


  it('deserializing a game with milestones', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {pathfindersExpansion: false});
    const terraformier = game.milestones.find((milestone) => milestone.name === 'Terraformer')!;

    game.claimedMilestones.push({
      milestone: terraformier,
      player: player,
    });
    const serialized = game.serialize();
    expect(serialized.claimedMilestones).deep.eq([{
      name: 'Terraformer',
      playerId: 'p-blue-id',
    }]);
  });

  // it('deserializing a game with renamed milestones', () => {
  //   const player = TestPlayer.BLUE.newPlayer();
  //   const player2 = TestPlayer.RED.newPlayer();
  //   const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid');
  //   const electrician = new Electrician();
  //   const collector = new Collector();

  //   game.milestones.unshift(electrician, collector);

  //   game.claimedMilestones.push({
  //     milestone: electrician,
  //     player: player,
  //   });
  //   game.claimedMilestones.push({
  //     milestone: collector,
  //     player: player,
  //   });

  //   const serialized = game.serialize();
  //   expect(serialized.milestones[0]).eq('V. Electrician');
  //   expect(serialized.claimedMilestones[0].name).eq('V. Electrician');
  //   expect(serialized.milestones[1]).eq('T. Collector');
  //   expect(serialized.claimedMilestones[1].name).eq('T. Collector');

  //   serialized.milestones[0] = 'Electrician' as any;
  //   serialized.claimedMilestones[0].name = 'Electrician' as any;
  //   serialized.milestones[1] = 'Collector' as any;
  //   serialized.claimedMilestones[1].name = 'Collector' as any;

  //   const deserialized = Game.deserialize(serialized);
  //   expect(deserialized.milestones[0]).deep.eq(electrician);
  //   expect(deserialized.milestones[1]).deep.eq(collector);
  //   expect(deserialized.claimedMilestones).has.length(2);
  //   expect(deserialized.claimedMilestones[0].milestone.name).eq('V. Electrician');
  //   expect(deserialized.claimedMilestones[0].player.id).eq('p-blue-id');
  //   expect(deserialized.claimedMilestones[1].milestone.name).eq('T. Collector');
  //   expect(deserialized.claimedMilestones[1].player.id).eq('p-blue-id');
  // });

  // https://github.com/terraforming-mars/terraforming-mars/issues/5572
  it('dealing with milestones accidentally claimed twice', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {pathfindersExpansion: false});
    const terraformier = game.milestones.find((milestone) => milestone.name === 'Terraformer')!;

    game.claimedMilestones.push({
      milestone: terraformier,
      player: player,
    });

    game.claimedMilestones.push({
      milestone: terraformier,
      player: player,
    });

    const serialized = game.serialize();
    // Serializing both of these isn't great, but it's how it works, and demonstrates how the
    // duplication goes away during deserialization
    expect(serialized.claimedMilestones).deep.eq([{
      name: 'Terraformer',
      playerId: 'p-blue-id',
    },
    {
      name: 'Terraformer',
      playerId: 'p-blue-id',
    }]);

    const deserialized = Game.deserialize(serialized);
    expect(deserialized.claimedMilestones).has.length(1);
    expect(deserialized.claimedMilestones[0].milestone.name).eq('Terraformer');
    expect(deserialized.claimedMilestones[0].player.id).eq('p-blue-id');
  });

  it('deserializing a colonies game includes discarded colonies #4522', () => {
    const toName = (x: IColony) => x.name;
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('gameid', [player, player2], player, 'spectatorid', {coloniesExtension: false});

    const colonyNames = game.colonies.map(toName);
    const discardedColonyNames = game.discardedColonies.map(toName);

    const serialized = game.serialize();
    const deserialized = Game.deserialize(serialized);
    expect(deserialized.colonies.map(toName)).has.members(colonyNames);
    expect(deserialized.discardedColonies.map(toName)).has.members(discardedColonyNames);
  });

  it('deserializing a custom colonies game only restores custom discarded colonies', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    const customColoniesList = [
      ColonyName.CALLISTO,
      ColonyName.CERES,
      ColonyName.ENCELADUS,
      ColonyName.EUROPA,
      ColonyName.GANYMEDE,
      ColonyName.IO,
    ];
    const game = Game.newInstance('g-custom-colonies-gameid', [player, player2], player, 'spectatorid', {
      coloniesExtension: true,
      customColoniesList,
    });
    const discardedColonyNames = game.discardedColonies.map(toName);

    const deserialized = Game.deserialize(game.serialize());

    expect(deserialized.discardedColonies.map(toName)).has.members(discardedColonyNames);
    expect(deserialized.discardedColonies.map(toName)).to.not.include(ColonyName.LUNA);
    expect(deserialized.discardedColonies.every((colony) => customColoniesList.includes(colony.name))).is.true;
  });

  it('wgt includes all parameters at the game start', () => {
    const player = new Player('blue', 'blue', false, 0, 'p-blue');
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {venusNextExtension: false});
    game.worldGovernmentTerraforming();
    const parameters = waitingForGlobalParameters(player);
    expect(parameters).to.have.members([
      GlobalParameter.OXYGEN,
      GlobalParameter.TEMPERATURE,
      GlobalParameter.OCEANS]);
  });

  it('wgt includes all parameters at the game start, with Venus', () => {
    const player = new Player('blue', 'blue', false, 0, 'p-blue');
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {venusNextExtension: true});
    game.worldGovernmentTerraforming();
    const parameters = waitingForGlobalParameters(player);
    expect(parameters).to.have.members([
      GlobalParameter.OXYGEN,
      GlobalParameter.TEMPERATURE,
      GlobalParameter.OCEANS,
      GlobalParameter.VENUS]);
  });

  it('wgt includes all parameters at the game start, with The Moon', () => {
    const player = new Player('blue', 'blue', false, 0, 'p-blue');
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {venusNextExtension: false, moonExpansion: true});
    game.worldGovernmentTerraforming();
    const parameters = waitingForGlobalParameters(player);
    expect(parameters).to.have.members([
      GlobalParameter.OXYGEN,
      GlobalParameter.TEMPERATURE,
      GlobalParameter.OCEANS,
      GlobalParameter.MOON_MINING_RATE,
      GlobalParameter.MOON_HABITAT_RATE,
      GlobalParameter.MOON_LOGISTIC_RATE]);
  });

  it('Deal preludes when starting preludes is undefined', () => {
    const player = TestPlayer.BLUE.newPlayer();
    Game.newInstance('gameid', [player], player, 'spectatorid', {preludeExtension: true, startingPreludes: undefined});
    expect(player.dealtPreludeCards).has.lengthOf(4);
  });

  it('Deal preludes when starting preludes is defined, 3', () => {
    const player = TestPlayer.BLUE.newPlayer();
    Game.newInstance('gameid', [player], player, 'spectatorid', {preludeExtension: true, startingPreludes: 3});
    expect(player.dealtPreludeCards).has.lengthOf(4);
  });

  it('Deal preludes when starting preludes is defined, 6', () => {
    const player = TestPlayer.BLUE.newPlayer();
    Game.newInstance('gameid', [player], player, 'spectatorid', {preludeExtension: true, startingPreludes: 6});
    expect(player.dealtPreludeCards).has.lengthOf(6);
  });

  it('Deal preludes when starting preludes is defined, 1; expect 4 preludes in hand', () => {
    const player = TestPlayer.BLUE.newPlayer();
    Game.newInstance('gameid', [player], player, 'spectatorid', {preludeExtension: true, startingPreludes: 1});
    expect(player.dealtPreludeCards).has.lengthOf(4);
  });

  it('Deal CEOs when starting CEOs is undefined', () => {
    const player = TestPlayer.BLUE.newPlayer();
    Game.newInstance('gameid', [player], player, 'spectatorid', {ceoExtension: true, startingCeos: undefined});
    expect(player.dealtCeoCards).has.lengthOf(3);
  });

  it('Deal CEOs when starting CEOs is defined, 4', () => {
    const player = TestPlayer.BLUE.newPlayer();
    Game.newInstance('gameid', [player], player, 'spectatorid', {ceoExtension: true, startingCeos: 4});
    expect(player.dealtCeoCards).has.lengthOf(4);
  });

  it('Arctic Algae works during WGT', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    player.playedCards.push(new ArcticAlgae());
    // player2 is first player, and will resolve WGT.
    const game = Game.newInstance('gameid', [player, player2], player2, 'spectatorid', {venusNextExtension: true});
    game.worldGovernmentTerraforming();
    const orOptions = cast(player2.popWaitingFor(), OrOptions);
    const oceanAction = cast(orOptions.options.filter((o) => o.title.toString() === 'Add an ocean')[0], SelectSpace);
    assertPlaceOcean(player2, oceanAction);
    expect(player.plants).to.eq(0);
    runAllActions(game);
    expect(player.plants).to.eq(2);
  });

  it('Arctic Algae works during WGT before Turmoil', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    player.playedCards.push(new ArcticAlgae());
    // player2 is first player, and will resolve WGT.
    const game = Game.newInstance('gameid', [player, player2], player2, 'spectatorid', {venusNextExtension: true, turmoilExtension: true});

  game.turmoil!.currentGlobalEvent = new TiredEarth(); // Lose one plant for each earth tag you have.
  player.tagsForTest = {earth: 1};

  game.worldGovernmentTerraforming();
  const [input, cb] = player2.popWaitingFor2();
  const orOptions = cast(input, OrOptions);
  const oceanAction = cast(orOptions.options.filter((o) => o.title.toString() === 'Add an ocean')[0], SelectSpace);
  assertPlaceOcean(player2, oceanAction);
  cb?.(); // Will gain 2 plants and lose 1 plant.

  expect(player.plants).to.eq(1);
  });

  it('game.tags excludes values accordingly', () => {
    const player = TestPlayer.BLUE.newPlayer();
    let game = Game.newInstance('gameid', [player], player, 'spectatorid', {pathfindersExpansion: true});
    expect(game.tags).does.not.include(Tag.VENUS);

    // Dyson Screens has a Venus tag.
    game = Game.newInstance('gameid', [player], player, 'spectatorid', {pathfindersExpansion: true, includedCards: [
      CardName.DYSON_SCREENS,
    ]});
    expect(game.tags).to.include(Tag.VENUS);
  });

  it('creating game sets expansions', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {pathfindersExpansion: true});
    expect(game.gameOptions.pathfindersExpansion).is.true;
    expect(game.gameOptions.expansions.pathfinders).is.true;
  });

  it('deserializing game sets expansions', () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('gameid', [player], player, 'spectatorid', {pathfindersExpansion: true});
    const serialized = game.serialize();

    expect(serialized.gameOptions.expansions.pathfinders).is.true;

    const game2 = Game.deserialize(serialized);

    expect(game2.gameOptions.pathfindersExpansion).is.true;
    expect(game2.gameOptions.expansions.pathfinders).is.true;
  });
});

function assertIsJSON(serialized: any) {
  for (const field in serialized) {
    if (serialized.hasOwnProperty(field)) {
      const val = serialized[field];
      const type = typeof(val);
      if (type === 'object') {
        assertIsJSON(val);
      } else if (type === 'function') {
        throw new Error(field + ' is invalid');
      }
    }
  }
}

function waitingForGlobalParameters(player: Player): Array<GlobalParameter> {
  function titlesToGlobalParameter(title: string): GlobalParameter {
    if (title.includes('temperature')) {
      return GlobalParameter.TEMPERATURE;
    }
    if (title.includes('ocean')) {
      return GlobalParameter.OCEANS;
    }
    if (title.includes('oxygen')) {
      return GlobalParameter.OXYGEN;
    }
    if (title.includes('Venus')) {
      return GlobalParameter.VENUS;
    }
    if (title.includes('habitat')) {
      return GlobalParameter.MOON_HABITAT_RATE;
    }
    if (title.includes('mining')) {
      return GlobalParameter.MOON_MINING_RATE;
    }
    if (title.includes('logistic')) {
      return GlobalParameter.MOON_LOGISTIC_RATE;
    }
    throw new Error('title does not match any description: ' + title);
  }
  return cast(player.getWaitingFor(), OrOptions).options.map((o) => o.title as string).map(titlesToGlobalParameter);
}
