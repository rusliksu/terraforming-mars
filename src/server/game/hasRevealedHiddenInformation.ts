import {ICard} from '../cards/ICard';
import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';

interface HiddenInformationOptions {
  /** Cards on the restored prompt were already visible before the reverted input. */
  restoredPromptCardsAreKnown?: boolean;
}

export function hasRevealedHiddenInformation(
  currentGame: IGame,
  restoredGame: IGame,
  player: IPlayer,
  options: HiddenInformationOptions = {},
): boolean {
  if (hasRandomCardSourceChanged(currentGame, restoredGame)) {
    return true;
  }

  const knownRestoredPromptCards = options.restoredPromptCardsAreKnown ?
    visiblePromptCardNames(restoredGame, player.id) :
    new Set<string>();
  for (const currentPlayer of currentGame.players) {
    const restoredPlayer = restoredGame.players.find((candidate) => candidate.id === currentPlayer.id);
    if (restoredPlayer === undefined) {
      return true;
    }
    const knownCards = currentPlayer.id === player.id ? knownRestoredPromptCards : new Set<string>();
    if (hasNewPrivateCards(currentPlayer, restoredPlayer, knownCards)) {
      return true;
    }
  }

  return waitingForShowsUnknownCards(player, restoredGame);
}

function hasRandomCardSourceChanged(currentGame: IGame, restoredGame: IGame): boolean {
  return deckSourceChanged(currentGame.projectDeck, restoredGame.projectDeck) ||
    deckSourceChanged(currentGame.preludeDeck, restoredGame.preludeDeck) ||
    deckSourceChanged(currentGame.corporationDeck, restoredGame.corporationDeck) ||
    deckSourceChanged(currentGame.ceoDeck, restoredGame.ceoDeck);
}

function deckSourceChanged(
  currentDeck: {drawPile: ReadonlyArray<ICard>, discardPile: ReadonlyArray<ICard>},
  restoredDeck: {drawPile: ReadonlyArray<ICard>, discardPile: ReadonlyArray<ICard>},
): boolean {
  if (!sameCards(currentDeck.drawPile, restoredDeck.drawPile)) {
    return true;
  }

  // A normal discard only appends public input to the pile. Removing or
  // reordering existing discards means a hidden discard source was inspected.
  const currentDiscards = cardNames(currentDeck.discardPile);
  const restoredDiscards = cardNames(restoredDeck.discardPile);
  return restoredDiscards.some((cardName, index) => currentDiscards[index] !== cardName);
}

function sameCards(first: ReadonlyArray<ICard>, second: ReadonlyArray<ICard>): boolean {
  return cardNames(first).join('|') === cardNames(second).join('|');
}

function hasNewPrivateCards(
  currentPlayer: IPlayer,
  restoredPlayer: IPlayer,
  alreadyKnownCards: ReadonlySet<string>,
): boolean {
  return hasAddedCards(currentPlayer.cardsInHand, restoredPlayer.cardsInHand, alreadyKnownCards) ||
    hasAddedCards(currentPlayer.dealtProjectCards, restoredPlayer.dealtProjectCards, alreadyKnownCards) ||
    hasAddedCards(currentPlayer.draftHand, restoredPlayer.draftHand, alreadyKnownCards) ||
    hasAddedCards(currentPlayer.draftedCards, restoredPlayer.draftedCards, alreadyKnownCards) ||
    hasAddedCards(currentPlayer.preludeCardsInHand, restoredPlayer.preludeCardsInHand, alreadyKnownCards) ||
    hasAddedCards(Array.from(currentPlayer.ceoCardsInHand), Array.from(restoredPlayer.ceoCardsInHand), alreadyKnownCards) ||
    hasAddedCards(currentPlayer.dealtCorporationCards, restoredPlayer.dealtCorporationCards, alreadyKnownCards) ||
    hasAddedCards(currentPlayer.dealtPreludeCards, restoredPlayer.dealtPreludeCards, alreadyKnownCards) ||
    hasAddedCards(currentPlayer.dealtCeoCards, restoredPlayer.dealtCeoCards, alreadyKnownCards);
}

function hasAddedCards(
  currentCards: ReadonlyArray<ICard>,
  restoredCards: ReadonlyArray<ICard>,
  alreadyKnownCards: ReadonlySet<string>,
): boolean {
  const restoredCounts = countCards(restoredCards);
  for (const card of currentCards) {
    const count = restoredCounts.get(card.name) ?? 0;
    if (count === 0) {
      if (!alreadyKnownCards.has(card.name)) {
        return true;
      }
      continue;
    }
    restoredCounts.set(card.name, count - 1);
  }
  return false;
}

function visiblePromptCardNames(game: IGame, playerId: IPlayer['id']): ReadonlySet<string> {
  const player = game.getPlayerById(playerId);
  const waitingForModel = player.getWaitingFor()?.toModel(player);
  if (waitingForModel === undefined || !('cards' in waitingForModel)) {
    return new Set<string>();
  }
  return new Set(waitingForModel.cards.map((card) => card.name));
}

function waitingForShowsUnknownCards(player: IPlayer, restoredGame: IGame): boolean {
  const waitingForModel = player.getWaitingFor()?.toModel(player);
  if (waitingForModel === undefined || !('cards' in waitingForModel)) {
    return false;
  }

  const knownCards = new Set<string>();
  for (const candidate of restoredGame.players) {
    for (const cardName of cardNames(candidate.tableau.asArray())) {
      knownCards.add(cardName);
    }
  }

  const restoredPlayer = restoredGame.getPlayerById(player.id);
  for (const cardName of [
    ...cardNames(restoredPlayer.cardsInHand),
    ...cardNames(restoredPlayer.dealtProjectCards),
    ...cardNames(restoredPlayer.draftHand),
    ...cardNames(restoredPlayer.draftedCards),
    ...cardNames(restoredPlayer.preludeCardsInHand),
    ...cardNames(Array.from(restoredPlayer.ceoCardsInHand)),
    ...cardNames(restoredPlayer.dealtCorporationCards),
    ...cardNames(restoredPlayer.dealtPreludeCards),
    ...cardNames(restoredPlayer.dealtCeoCards),
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
