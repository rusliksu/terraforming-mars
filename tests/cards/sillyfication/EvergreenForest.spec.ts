import {expect} from 'chai';
import {EvergreenForest} from '../../../src/server/cards/sillyfication/EvergreenForest';
import {IGame} from '../../../src/server/IGame';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('EvergreenForest', () => {
  let card: EvergreenForest;
  let player: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;

  beforeEach(() => {
    card = new EvergreenForest();
    [game, player] = testGame(2, {turmoilExtension: true});
    turmoil = game.turmoil!;
    player.playedCards.push(card);
  });

  it('requires Greens ruling or 2 delegates there', () => {
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.REDS);
    expect(card.canPlay(player)).is.false;

    turmoil.rulingParty = turmoil.getPartyByName(PartyName.GREENS);
    expect(card.canPlay(player)).is.true;
  });

  it('adds a seed when the owner places a greenery', () => {
    const space = game.board.getAvailableSpacesForGreenery(player)[0];
    game.addGreenery(player, space);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
  });

  it('does not react to a city tile', () => {
    game.addCity(player, game.board.getAvailableSpacesForCity(player)[0]);
    expect(card.resourceCount).to.eq(0);
  });

  it('converts each seed into a card at production', () => {
    player.addResourceTo(card, {qty: 3, log: false});
    player.cardsInHand = [];

    card.onProductionPhase(player);

    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand).to.have.lengthOf(3);
  });

  it('does nothing at production with no seeds', () => {
    player.cardsInHand = [];
    card.onProductionPhase(player);
    expect(player.cardsInHand).to.have.lengthOf(0);
  });
});
