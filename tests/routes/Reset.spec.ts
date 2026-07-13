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

  it('steps Project Eden back to the previous placement prompt', async () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoOption: true});
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
    expect(model.waitingFor?.type).eq('space');
    expect(model.waitingFor?.title).eq('Select space for city tile');
    expect(model.game.undoCount).eq(1);
    const replayed = await scaffolding.ctx.gameLoader.getGame(player.id);
    expect(replayed?.board.spaces.some((space) => space.player?.id === player.id)).is.false;
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
