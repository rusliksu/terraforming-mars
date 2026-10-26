import {expect} from 'chai';
import {WeatherControlCB} from '../../../src/server/cards/corporatebetterments/WeatherControlCB';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity, addGreenery} from '../../TestingUtils';

describe('WeatherControlCB', () => {
  let card: WeatherControlCB;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new WeatherControlCB();
    [/* game */, player, player2] = testGame(2);
  });

  it('pays 2 M€ per tile the active player owns, and 1 M€ per tile others own', () => {
    addCity(player);
    addGreenery(player);
    addGreenery(player2);

    player.megaCredits = 0;
    player2.megaCredits = 0;

    card.play(player);

    expect(player.megaCredits).to.eq(4);
    expect(player2.megaCredits).to.eq(1);
  });

  it('does nothing for a player with no tiles', () => {
    player.megaCredits = 0;
    card.play(player);
    expect(player.megaCredits).to.eq(0);
  });
});
