import {expect} from 'chai';
import {Reset} from '../../src/server/routes/Reset';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';
import {MockResponse} from './HttpMocks';
import {PlayerViewModel} from '../../src/common/models/PlayerModel';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {IGame} from '../../src/server/IGame';
import {GameId, PlayerId, SpectatorId} from '../../src/common/Types';
import {GameIdLedger} from '../../src/server/database/IDatabase';
import {testGame} from '../TestGame';
import {Phase} from '../../src/common/Phase';
import {ProjectEden} from '../../src/server/cards/prelude2/ProjectEden';
import {ArcticAlgae} from '../../src/server/cards/base/ArcticAlgae';
import {BiomassCombustors} from '../../src/server/cards/base/BiomassCombustors';
import {Comet} from '../../src/server/cards/base/Comet';
import {CardName} from '../../src/common/cards/CardName';
import {InputResponse} from '../../src/common/inputs/InputResponse';
import {prepareActionReplayEntry, recordAcceptedActionReplayEntry} from '../../src/server/game/ActionReplay';
import {HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED} from '../../src/common/undo';
import {HiTechLab} from '../../src/server/cards/promo/HiTechLab';
import {LogMessageType} from '../../src/common/logs/LogMessageType';
import {appendCanceledLogMessages} from '../../src/server/logs/appendCanceledLogMessages';

describe('Reset', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  it('reloads multiplayer action state when undo is enabled', async () => {
    const currentPlayer = TestPlayer.BLACK.newPlayer();
    const currentOpponent = TestPlayer.RED.newPlayer();
    const currentGame = Game.newInstance('game-id', [currentPlayer, currentOpponent], currentPlayer, 'spectatorid', {undoOption: true});
    currentGame.undoCount = 3;
    currentGame.gameAge = 8;
    currentPlayer.actionsTakenThisRound = 1;

    const reloadedPlayer = TestPlayer.BLACK.newPlayer();
    const reloadedOpponent = TestPlayer.RED.newPlayer();
    const reloadedGame = Game.newInstance('game-id', [reloadedPlayer, reloadedOpponent], reloadedPlayer, 'spectatorid', {undoOption: true});
    reloadedGame.undoCount = 2;
    reloadedGame.gameAge = 7;
    reloadedPlayer.actionsTakenThisRound = 1;

    useReloadingGameLoader(scaffolding, currentGame, reloadedGame);
    scaffolding.url = '/reset?id=' + currentPlayer.id;

    await scaffolding.get(Reset.INSTANCE, res);

    const response: PlayerViewModel = JSON.parse(res.content);
    expect(response.id).eq(reloadedPlayer.id);
    expect(response.game.undoCount).eq(4);
    expect(response.thisPlayer.actionsTakenThisRound).eq(1);
  });

  it('blocks multiplayer reset when undo is disabled', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const opponent = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, opponent], player, 'spectatorid', {undoOption: false});
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = '/reset?id=' + player.id;

    await scaffolding.get(Reset.INSTANCE, res);

    expect(res.content).eq('Bad request: Cancel action requires undo to be enabled');
  });

  it('allows action undo for an existing game with only experimental step undo enabled', async () => {
    const currentPlayer = TestPlayer.BLACK.newPlayer();
    const currentOpponent = TestPlayer.RED.newPlayer();
    const currentGame = Game.newInstance('game-id', [currentPlayer, currentOpponent], currentPlayer, 'spectatorid', {undoOption: false, undoStepOption: true});

    const reloadedPlayer = TestPlayer.BLACK.newPlayer();
    const reloadedOpponent = TestPlayer.RED.newPlayer();
    const reloadedGame = Game.newInstance('game-id', [reloadedPlayer, reloadedOpponent], reloadedPlayer, 'spectatorid', {undoOption: false, undoStepOption: true});

    useReloadingGameLoader(scaffolding, currentGame, reloadedGame);
    scaffolding.url = '/reset?id=' + currentPlayer.id;

    await scaffolding.get(Reset.INSTANCE, res);

    expect(res.statusCode).eq(200);
    expect(JSON.parse(res.content).id).eq(reloadedPlayer.id);
  });

  it('requires the separate experimental option for one-step undo', async () => {
    const player = TestPlayer.BLACK.newPlayer();
    const opponent = TestPlayer.RED.newPlayer();
    const game = Game.newInstance('game-id', [player, opponent], player, 'spectatorid', {undoOption: true});
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = `/reset?id=${player.id}&mode=step`;

    await scaffolding.get(Reset.INSTANCE, res);

    expect(res.content).eq('Bad request: Undo one step requires the experimental game option to be enabled');
  });

  it('restores a completed research purchase while waiting for other players', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoStepOption: true, draftVariant: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.RESEARCH;
    player.megaCredits = 10;
    player.draftedCards = [new ArcticAlgae(), new BiomassCombustors()];
    player.runResearchPhase();
    player.process({type: 'card', cards: [CardName.ARCTIC_ALGAE]});

    expect(player.cardsInHand.map((card) => card.name)).deep.eq([CardName.ARCTIC_ALGAE]);
    expect(player.canUndoResearchPurchase()).is.true;
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = `/reset?id=${player.id}&mode=research`;

    await scaffolding.get(Reset.INSTANCE, res);

    expect(res.statusCode, res.content).eq(200);
    const model: PlayerViewModel = JSON.parse(res.content);
    expect(model.waitingFor?.type).eq('card');
    expect(player.cardsInHand).is.empty;
    expect(model.waitingFor?.type === 'card' ? model.waitingFor.cards.map((card) => card.name) : []).deep.eq([
      CardName.ARCTIC_ALGAE,
      CardName.BIOMASS_COMBUSTORS,
    ]);
    expect(game.gameLog.some((message) => message.canceled === true)).is.true;
  });

  it('warns before reloading an action that revealed deck information', async () => {
    const currentPlayer = TestPlayer.BLACK.newPlayer();
    const currentOpponent = TestPlayer.RED.newPlayer();
    const currentGame = Game.newInstance('game-id', [currentPlayer, currentOpponent], currentPlayer, 'spectatorid', {undoOption: true});
    currentGame.projectDeck.draw(currentGame);

    const reloadedPlayer = TestPlayer.BLACK.newPlayer();
    const reloadedOpponent = TestPlayer.RED.newPlayer();
    const reloadedGame = Game.newInstance('game-id', [reloadedPlayer, reloadedOpponent], reloadedPlayer, 'spectatorid', {undoOption: true});

    let addedGame: IGame | undefined;
    useReloadingGameLoader(scaffolding, currentGame, reloadedGame, (game) => {
      addedGame = game;
    });
    scaffolding.url = '/reset?id=' + currentPlayer.id;

    await scaffolding.get(Reset.INSTANCE, res);

    expect(JSON.parse(res.content)).deep.eq({
      id: '#undo-revealed-hidden-information',
      message: HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED,
    });
    expect(addedGame).eq(currentGame);

    const confirmedRes = new MockResponse();
    scaffolding.url = '/reset?id=' + currentPlayer.id + '&confirmHiddenInformation=true';
    await scaffolding.get(Reset.INSTANCE, confirmedRes);

    expect(confirmedRes.statusCode).eq(200);
    const confirmedModel: PlayerViewModel = JSON.parse(confirmedRes.content);
    expect(confirmedModel.id).eq(reloadedPlayer.id);
    expect(reloadedGame.gameLog[reloadedGame.gameLog.length - 1].type)
      .eq(LogMessageType.IRREVERSIBLE_UNDO);
  });

  it('appends canceled log messages from the current action', async () => {
    const currentPlayer = TestPlayer.BLACK.newPlayer();
    const currentOpponent = TestPlayer.RED.newPlayer();
    const currentGame = Game.newInstance('game-id', [currentPlayer, currentOpponent], currentPlayer, 'spectatorid', {undoOption: true});
    currentGame.gameLog.length = 0;
    currentGame.gameAge = 0;
    currentGame.log('Kept action');
    currentGame.log('Canceled action');

    const reloadedPlayer = TestPlayer.BLACK.newPlayer();
    const reloadedOpponent = TestPlayer.RED.newPlayer();
    const reloadedGame = Game.newInstance('game-id', [reloadedPlayer, reloadedOpponent], reloadedPlayer, 'spectatorid', {undoOption: true});
    reloadedGame.gameLog.length = 0;
    reloadedGame.gameAge = 0;
    reloadedGame.log('Kept action');

    useReloadingGameLoader(scaffolding, currentGame, reloadedGame);
    scaffolding.url = '/reset?id=' + currentPlayer.id;

    await scaffolding.get(Reset.INSTANCE, res);

    expect(reloadedGame.gameLog.map((message) => message.message)).deep.eq([
      'Kept action',
      'Canceled action',
    ]);
    expect(reloadedGame.gameLog[1].canceled).eq(true);
    expect(reloadedGame.gameAge).eq(2);
  });

  it('uses the replay entry log boundary when replay recreated prior log entries', () => {
    const currentPlayer = TestPlayer.BLACK.newPlayer();
    const currentGame = Game.newInstance('game-id', [currentPlayer], currentPlayer, 'spectatorid');
    currentGame.gameLog.length = 0;
    currentGame.log('Before action');
    currentGame.log('Played card');
    currentGame.log('Placed tile');

    const replayedPlayer = TestPlayer.BLACK.newPlayer();
    const replayedGame = Game.newInstance('game-id', [replayedPlayer], replayedPlayer, 'spectatorid');
    replayedGame.gameLog.length = 0;
    replayedGame.log('Before action');
    replayedGame.log('Played card');
    replayedGame.log('Placed tile');

    appendCanceledLogMessages(currentGame, replayedGame, 1);

    expect(replayedGame.gameLog.map((message) => [message.message, message.canceled === true])).deep.eq([
      ['Before action', false],
      ['Played card', false],
      ['Placed tile', false],
      ['Played card', true],
      ['Placed tile', true],
    ]);
  });

  it('steps Project Eden back to its effect-choice prompt', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoOption: true, undoStepOption: true});
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

    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = `/reset?id=${player.id}&mode=step`;
    await scaffolding.get(Reset.INSTANCE, res);

    const model: PlayerViewModel = JSON.parse(res.content);
    expect(res.statusCode).eq(200);
    expect(model.waitingFor?.type).eq('or');
    if (model.waitingFor?.type !== 'or') {
      throw new Error('Expected Project Eden effect-choice prompt');
    }
    expect(model.waitingFor.options.map((option) => option.title)).to.include('Place a city');
    expect(model.game.undoCount).eq(1);
    const replayed = await scaffolding.ctx.gameLoader.getGame(player.id);
    expect(replayed?.board.spaces.some((space) => space.player?.id === player.id)).is.false;
    expect(replayed?.gameLog.some((message) => message.canceled === true)).is.true;
  });

  it('allows reselecting a revealed Hi-Tech Lab card but warns before undoing the reveal', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoOption: true, undoStepOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.simulationMode = true;
    game.activePlayer = player;
    player.energy = 3;
    player.playedCards.push(new HiTechLab());
    player.takeAction(false);

    const accept = (input: InputResponse) => {
      const entry = prepareActionReplayEntry(game, player.id, input);
      expect(entry).not.eq(undefined);
      player.process(input);
      recordAcceptedActionReplayEntry(game, entry!);
    };
    const rootPrompt = player.getWaitingFor()?.toModel(player);
    const actionCardIndex = rootPrompt?.type === 'or' ?
      rootPrompt.options.findIndex((option) => option.title === 'Perform an action from a played card') : -1;
    expect(actionCardIndex).gte(0);
    accept({
      type: 'or',
      index: actionCardIndex,
      response: {type: 'card', cards: [CardName.HI_TECH_LAB]},
    });
    accept({type: 'amount', amount: 3});
    const revealedPrompt = player.getWaitingFor()?.toModel(player);
    if (revealedPrompt?.type !== 'card') {
      throw new Error('Expected revealed-card choice');
    }
    accept({type: 'card', cards: [revealedPrompt.cards[0].name]});

    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = `/reset?id=${player.id}&mode=step`;
    await scaffolding.get(Reset.INSTANCE, res);

    expect(res.statusCode).eq(200);
    const reselectionModel: PlayerViewModel = JSON.parse(res.content);
    expect(reselectionModel.waitingFor?.type).eq('card');
    if (reselectionModel.waitingFor?.type !== 'card') {
      throw new Error('Expected replayed revealed-card choice');
    }
    expect(reselectionModel.waitingFor.cards.map((card) => card.name))
      .deep.eq(revealedPrompt.cards.map((card) => card.name));

    const warningRes = new MockResponse();
    await scaffolding.get(Reset.INSTANCE, warningRes);
    expect(JSON.parse(warningRes.content)).deep.eq({
      id: '#undo-revealed-hidden-information',
      message: HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED,
    });

    const confirmedRes = new MockResponse();
    scaffolding.url = `/reset?id=${player.id}&mode=step&confirmHiddenInformation=true`;
    await scaffolding.get(Reset.INSTANCE, confirmedRes);

    expect(confirmedRes.statusCode).eq(200);
    const beforeRevealModel: PlayerViewModel = JSON.parse(confirmedRes.content);
    expect(beforeRevealModel.waitingFor?.type).eq('amount');
    const beforeReveal = await scaffolding.ctx.gameLoader.getGame(player.id);
    expect(beforeReveal).not.eq(undefined);
    const warningLog = beforeReveal!.gameLog[beforeReveal!.gameLog.length - 1];
    expect(warningLog?.type).eq(LogMessageType.IRREVERSIBLE_UNDO);
    expect(warningLog?.message)
      .eq('${0} undid an irreversible action after revealing hidden information');
  });
});

function useReloadingGameLoader(
  scaffolding: RouteTestScaffolding,
  currentGame: IGame,
  reloadedGame: IGame,
  onAdd?: (game: IGame) => void,
) {
  scaffolding.ctx.gameLoader = {
    add(game: IGame): Promise<void> {
      onAdd?.(game);
      return Promise.resolve();
    },
    getIds(): Promise<Array<GameIdLedger>> {
      return Promise.resolve([]);
    },
    getLastSaveTimeMs(): Promise<number | undefined> {
      return Promise.resolve(undefined);
    },
    getLastSaveTimesMs(): Promise<Map<GameId, number | undefined>> {
      return Promise.resolve(new Map());
    },
    getGame(_id: GameId | PlayerId | SpectatorId, forceLoad?: boolean): Promise<IGame | undefined> {
      return Promise.resolve(forceLoad === true ? reloadedGame : currentGame);
    },
    getGameAt(): Promise<IGame> {
      return Promise.reject(new Error('not implemented'));
    },
    getGameAtOrBefore(): Promise<IGame> {
      return Promise.reject(new Error('not implemented'));
    },
    restoreGameAt(): Promise<IGame> {
      return Promise.reject(new Error('not implemented'));
    },
    mark() {},
    saveGame(): Promise<void> {
      return Promise.resolve();
    },
    completeGame(): Promise<void> {
      return Promise.resolve();
    },
    maintenance(): Promise<void> {
      return Promise.resolve();
    },
  };
}
