import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {setVenusScaleLevel} from '../../TestingUtils';
import {VenusianTransports} from '../../../src/server/cards/corporatebetterments/VenusianTransports';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';

describe('VenusianTransports', () => {
  let card: VenusianTransports;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new VenusianTransports();
    [game, player] = testGame(2);
  });

  it('cannot play below 12% Venus', () => {
    setVenusScaleLevel(game, 10);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 12% Venus', () => {
    setVenusScaleLevel(game, 12);
    expect(card.canPlay(player)).is.true;
  });

  it('gains 1 M€ per Venus tag, including this card', () => {
    player.playedCards.push(card);
    card.action(player);
    // Only this card's own Venus tag.
    expect(player.megaCredits).to.eq(1);
  });
});
