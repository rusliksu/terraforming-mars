import {expect} from 'chai';
import {VenusianCollaboration} from '../../../src/server/cards/corporatebetterments/VenusianCollaboration';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions, setVenusScaleLevel} from '../../TestingUtils';

describe('VenusianCollaboration', () => {
  let card: VenusianCollaboration;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new VenusianCollaboration();
    [game, player] = testGame(2, {venusNextExtension: true});
  });

  it('cannot play without a floater', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play once you have a floater', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    player.addResourceTo(dirigibles);
    expect(card.canPlay(player)).is.true;
  });

  it('gains TR and heat production for every 10% of Venus, and adds floaters to a card', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    player.addResourceTo(dirigibles);
    setVenusScaleLevel(game, 24);

    const startingTr = player.terraformRating;
    card.play(player);
    runAllActions(game);

    expect(player.terraformRating).to.eq(startingTr + 2);
    expect(player.production.heat).to.eq(2);
    // Dirigibles is the only floater-holding card in play, so it's picked automatically.
    // (It started with the 1 floater added above, plus 3 from the card's effect.)
    expect(dirigibles.resourceCount).to.eq(4);
  });
});
