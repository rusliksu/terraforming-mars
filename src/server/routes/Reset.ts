import * as responses from '../server/responses';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {IPlayer} from '../IPlayer';
import {isPlayerId} from '../../common/Types';
import {Request} from '../Request';
import {Response} from '../Response';
import {IGame} from '../IGame';
import {ICard} from '../cards/ICard';

/**
 * Reloads the game from the last action.
 *
 * This may only be called by the active player. It reloads the game.
 * Now, given the current save behavior. The game isn't saved after every action.
 * I think it's saved after every action when undo is on. So, there's that.
 * But I forget when the game is saved in solo. Probably all will be well.
 *
 * Eventually, this will not be callable once cards are drawn.
 */
export class Reset extends Handler {
  public static readonly INSTANCE = new Reset();
  private constructor() {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.url.searchParams.get('id');
    if (playerId === null) {
      responses.badRequest(req, res, 'missing id parameter');
      return;
    }

    if (!isPlayerId(playerId)) {
      responses.badRequest(req, res, 'invalid player id');
      return;
    }

    // This is the exact same code as in `ApiPlayer`. I bet it's not the only place.
    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      responses.notFound(req, res);
      return;
    }

    if (game.players.length > 1 && game.gameOptions.undoOption !== true) {
      responses.badRequest(req, res, 'Cancel action requires undo to be enabled');
      return;
    }

    let player: IPlayer | undefined;
    try {
      player = game.getPlayerById(playerId);
    } catch (err) {
      console.warn(`unable to find player ${playerId}`, err);
    }
    if (player === undefined) {
      responses.notFound(req, res);
      return;
    }
    if (player.game.activePlayer.id !== player.id) {
      responses.badRequest(req, res, 'Not the active player');
      return;
    }

    try {
      const currentGame = player.game;
      const reloadedGame = await ctx.gameLoader.getGame(currentGame.id, /** force reload */ true);
      if (reloadedGame !== undefined) {
        if (hasRevealedHiddenInformation(currentGame, reloadedGame, player)) {
          await ctx.gameLoader.add(currentGame);
          responses.badRequest(req, res, 'Cannot cancel action after hidden information was revealed');
          return;
        }

        const reloadedPlayer = reloadedGame.getPlayerById(player.id);
        reloadedGame.inputsThisRound = 0;
        reloadedGame.undoCount = Math.max(reloadedGame.undoCount, currentGame.undoCount) + 1;
        responses.writeJson(res, ctx, Server.getPlayerModel(reloadedPlayer));
        return;
      }
    } catch (err) {
      console.error(err);
    }
    responses.badRequest(req, res, 'Could not reset');
  }
}

function hasRevealedHiddenInformation(currentGame: IGame, reloadedGame: IGame, player: IPlayer): boolean {
  if (hasDeckDrawPileChanged(currentGame, reloadedGame)) {
    return true;
  }

  for (const currentPlayer of currentGame.players) {
    const reloadedPlayer = reloadedGame.players.find((candidate) => candidate.id === currentPlayer.id);
    if (reloadedPlayer === undefined) {
      return true;
    }
    if (hasNewPrivateCards(currentPlayer, reloadedPlayer)) {
      return true;
    }
  }

  return waitingForShowsUnknownCards(player, reloadedGame);
}

function hasDeckDrawPileChanged(currentGame: IGame, reloadedGame: IGame): boolean {
  return cardNames(currentGame.projectDeck.drawPile).join('|') !== cardNames(reloadedGame.projectDeck.drawPile).join('|') ||
    cardNames(currentGame.preludeDeck.drawPile).join('|') !== cardNames(reloadedGame.preludeDeck.drawPile).join('|') ||
    cardNames(currentGame.corporationDeck.drawPile).join('|') !== cardNames(reloadedGame.corporationDeck.drawPile).join('|') ||
    cardNames(currentGame.ceoDeck.drawPile).join('|') !== cardNames(reloadedGame.ceoDeck.drawPile).join('|');
}

function hasNewPrivateCards(currentPlayer: IPlayer, reloadedPlayer: IPlayer): boolean {
  return hasAddedCards(currentPlayer.cardsInHand, reloadedPlayer.cardsInHand) ||
    hasAddedCards(currentPlayer.dealtProjectCards, reloadedPlayer.dealtProjectCards) ||
    hasAddedCards(currentPlayer.draftHand, reloadedPlayer.draftHand) ||
    hasAddedCards(currentPlayer.draftedCards, reloadedPlayer.draftedCards) ||
    hasAddedCards(currentPlayer.preludeCardsInHand, reloadedPlayer.preludeCardsInHand) ||
    hasAddedCards(Array.from(currentPlayer.ceoCardsInHand), Array.from(reloadedPlayer.ceoCardsInHand)) ||
    hasAddedCards(currentPlayer.dealtCorporationCards, reloadedPlayer.dealtCorporationCards) ||
    hasAddedCards(currentPlayer.dealtPreludeCards, reloadedPlayer.dealtPreludeCards) ||
    hasAddedCards(currentPlayer.dealtCeoCards, reloadedPlayer.dealtCeoCards);
}

function hasAddedCards(currentCards: ReadonlyArray<ICard>, reloadedCards: ReadonlyArray<ICard>): boolean {
  const reloadedCounts = countCards(reloadedCards);
  for (const card of currentCards) {
    const count = reloadedCounts.get(card.name) ?? 0;
    if (count === 0) {
      return true;
    }
    reloadedCounts.set(card.name, count - 1);
  }
  return false;
}

function waitingForShowsUnknownCards(player: IPlayer, reloadedGame: IGame): boolean {
  const waitingForModel = player.getWaitingFor()?.toModel(player);
  if (waitingForModel === undefined || !('cards' in waitingForModel)) {
    return false;
  }

  const knownCards = new Set<string>();
  for (const candidate of reloadedGame.players) {
    for (const cardName of cardNames(candidate.tableau.asArray())) {
      knownCards.add(cardName);
    }
  }

  const reloadedPlayer = reloadedGame.getPlayerById(player.id);
  for (const cardName of [
    ...cardNames(reloadedPlayer.cardsInHand),
    ...cardNames(reloadedPlayer.dealtProjectCards),
    ...cardNames(reloadedPlayer.draftHand),
    ...cardNames(reloadedPlayer.draftedCards),
    ...cardNames(reloadedPlayer.preludeCardsInHand),
    ...cardNames(Array.from(reloadedPlayer.ceoCardsInHand)),
    ...cardNames(reloadedPlayer.dealtCorporationCards),
    ...cardNames(reloadedPlayer.dealtPreludeCards),
    ...cardNames(reloadedPlayer.dealtCeoCards),
  ]) {
    knownCards.add(cardName);
  }

  return waitingForModel.cards.some((card) => !knownCards.has(card.name));
}

function countCards(cards: ReadonlyArray<ICard>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  }
  return counts;
}

function cardNames(cards: ReadonlyArray<ICard>): Array<string> {
  return cards.map((card) => card.name);
}
