import {expect} from 'chai';
import {testGame} from '../TestGame';
import {SelectInitialCards} from '../../src/server/inputs/SelectInitialCards';
import {TestPlayer} from '../TestPlayer';
import {CardName} from '../../src/common/cards/CardName';
import {ICorporationCard} from '../../src/server/cards/corporation/ICorporationCard';
import {cardsFromJSON, ceosFromJSON, corporationCardsFromJSON, preludesFromJSON} from '../../src/server/createCard';
import {toName} from '../../src/common/utils/utils';
import {EarthCatapult} from '../../src/server/cards/base/EarthCatapult';

describe('SelectInitialCards', () => {
  let player: TestPlayer;
  let corp: ICorporationCard | undefined = undefined;
  let selectInitialCards: SelectInitialCards;

  function cb(corporation: ICorporationCard) {
    corp = corporation;
    return undefined;
  }

  beforeEach(() => {
    [/* game */, player] = testGame(1);
    player.dealtCorporationCards = corporationCardsFromJSON([CardName.INVENTRIX, CardName.HELION]);
    player.dealtProjectCards = cardsFromJSON([CardName.ANTS, CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    selectInitialCards = new SelectInitialCards(player, cb);
  });

  it('fail, no corporations', () => {
    expect(() =>
      selectInitialCards.process({type: 'initialCards', responses: [
        {type: 'card', cards: []},
        {type: 'card', cards: []},
      ]}, player))
      .to.throw(/Not enough cards selected/);
  });

  it('fail, invalid corporation', () => {
    expect(() =>
      selectInitialCards.process({type: 'initialCards', responses: [
        {type: 'card', cards: [CardName.THARSIS_REPUBLIC]},
        {type: 'card', cards: []},
      ]}, player))
      .to.throw(/Card Tharsis Republic not found/);
  });

  it('fail, too many corporations', () => {
    expect(() =>
      selectInitialCards.process({type: 'initialCards', responses: [
        {type: 'card', cards: [CardName.INVENTRIX, CardName.HELION]},
        {type: 'card', cards: []},
      ]}, player))
      .to.throw(/Too many cards selected/);
  });

  it('Simple', () => {
    player.game.projectDeck.discardPile.length = 0; // Emptying the discard pile, which has 4 cards setting up the solo opponent.
    // player.game.corporationDeck.discardPile.length = 0;

    selectInitialCards.process({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.INVENTRIX]},
      {type: 'card', cards: [CardName.ANTS]},
    ]}, player);

    expect(player.playedCards.corporations()).is.empty; // This input object doesn't set the player's corporation card
    expect(corp!.name).eq(CardName.INVENTRIX);
    expect(player.cardsInHand.map(toName)).to.have.members([CardName.ANTS]); // But it does set their cards in hand.

    expect(player.game.projectDeck.discardPile.map(toName)).to.have.members([CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    expect(player.game.corporationDeck.discardPile.map(toName)).to.have.members([CardName.HELION]);

    const corporationLog = player.game.gameLog.find((entry) => entry.message === 'You selected ${0} from ${1}');
    expect(corporationLog?.playerId).eq(player.id);
    expect(corporationLog?.data.map((datum) => datum.value)).deep.eq([
      CardName.INVENTRIX,
      [CardName.INVENTRIX, CardName.HELION],
    ]);
  });

  it('Full', () => {
    const [/* game */, player] = testGame(1, {ceoExtension: true, preludeExtension: true});
    player.game.projectDeck.discardPile.length = 0; // Emptying the discard pile, which has 4 cards setting up the solo opponent.
    player.game.corporationDeck.discardPile.length = 0;
    player.dealtCorporationCards = corporationCardsFromJSON([CardName.INVENTRIX, CardName.HELION]);
    player.dealtProjectCards = cardsFromJSON([CardName.ANTS, CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    player.dealtPreludeCards = preludesFromJSON([CardName.LOAN, CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
    player.dealtCeoCards = ceosFromJSON([CardName.ASIMOV, CardName.MUSK]);
    selectInitialCards = new SelectInitialCards(player, cb);

    selectInitialCards.process({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.INVENTRIX]},
      {type: 'card', cards: [CardName.LOAN, CardName.BIOLAB]},
      {type: 'card', cards: [CardName.ASIMOV]},
      {type: 'card', cards: [CardName.ANTS]},
    ]}, player);

    expect(player.playedCards.corporations()).is.empty; // This input object doesn't set the player's corporation card
    expect(corp!.name).eq(CardName.INVENTRIX);
    expect(player.cardsInHand.map(toName)).to.have.members([CardName.ANTS]); // But it does set their cards in hand.
    expect(Array.from(player.ceoCardsInHand).map(toName)).to.have.members([CardName.ASIMOV]);
    expect(player.preludeCardsInHand.map(toName)).to.have.members([CardName.LOAN, CardName.BIOLAB]);

    expect(player.game.projectDeck.discardPile.map(toName)).to.have.members([CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]);
    expect(player.game.corporationDeck.discardPile.map(toName)).to.have.members([CardName.HELION]);
    expect(player.game.ceoDeck.discardPile.map(toName)).to.have.members([CardName.MUSK]);
    expect(player.game.preludeDeck.discardPile.map(toName)).to.have.members([CardName.DONATION, CardName.SUPPLIER]);

    const selectionLogs = player.game.gameLog.filter((entry) => entry.playerId === player.id && entry.message.startsWith('You selected'));
    expect(selectionLogs.map((entry) => entry.data.map((datum) => datum.value))).deep.eq([
      [[CardName.LOAN, CardName.BIOLAB], [CardName.DONATION, CardName.SUPPLIER]],
      [[CardName.ASIMOV], [CardName.MUSK]],
      [[CardName.ANTS], [CardName.BACTOVIRAL_RESEARCH, CardName.COMET_AIMING, CardName.DIRIGIBLES]],
      [CardName.INVENTRIX, [CardName.INVENTRIX, CardName.HELION]],
    ]);
  });

  it('selects one prelude when prelude handicap is 1', () => {
    const [/* game */, player] = testGame(1, {preludeExtension: true});
    player.game.projectDeck.discardPile.length = 0;
    player.game.corporationDeck.discardPile.length = 0;
    player.preludeHandicap = 1;
    player.dealtCorporationCards = corporationCardsFromJSON([CardName.INVENTRIX, CardName.HELION]);
    player.dealtProjectCards = cardsFromJSON([CardName.ANTS, CardName.BACTOVIRAL_RESEARCH]);
    player.dealtPreludeCards = preludesFromJSON([CardName.LOAN, CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
    selectInitialCards = new SelectInitialCards(player, cb);

    selectInitialCards.process({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.INVENTRIX]},
      {type: 'card', cards: [CardName.LOAN]},
      {type: 'card', cards: []},
    ]}, player);

    expect(player.preludeCardsInHand.map(toName)).deep.eq([CardName.LOAN]);
    expect(player.game.preludeDeck.discardPile.map(toName)).to.have.members([CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
  });

  it('skips prelude selection when prelude handicap is 0', () => {
    const [/* game */, player] = testGame(1, {preludeExtension: true});
    player.game.projectDeck.discardPile.length = 0;
    player.game.corporationDeck.discardPile.length = 0;
    player.preludeHandicap = 0;
    player.dealtCorporationCards = corporationCardsFromJSON([CardName.INVENTRIX, CardName.HELION]);
    player.dealtProjectCards = cardsFromJSON([CardName.ANTS, CardName.BACTOVIRAL_RESEARCH]);
    player.dealtPreludeCards = preludesFromJSON([CardName.LOAN, CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
    selectInitialCards = new SelectInitialCards(player, cb);

    expect(selectInitialCards.inputs.prelude).eq(undefined);
    selectInitialCards.process({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.INVENTRIX]},
      {type: 'card', cards: []},
    ]}, player);

    expect(player.preludeCardsInHand).is.empty;
    expect(player.game.preludeDeck.discardPile.map(toName)).to.have.members([CardName.LOAN, CardName.BIOLAB, CardName.DONATION, CardName.SUPPLIER]);
  });

  it('shows calculated project costs in the initial selection', () => {
    player.playedCards.push(new EarthCatapult());

    const model = selectInitialCards.toModel(player);
    const projectOption = model.options[1];
    if (projectOption.type !== 'card') {
      throw new Error('Expected project option to be a SelectCardModel');
    }

    const dealtProjectCard = player.dealtProjectCards[0];
    const projectCardModel = projectOption.cards.find((card) => card.name === dealtProjectCard.name);

    expect(projectCardModel?.calculatedCost).eq(player.getCardCost(dealtProjectCard));
    expect(projectCardModel?.calculatedCost).eq(dealtProjectCard.cost - 2);
  });
});
