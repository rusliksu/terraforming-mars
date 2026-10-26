import {expect} from 'chai';
import {InterplanetaryAdvertisingNetwork} from '../../../src/server/cards/corporatebetterments/InterplanetaryAdvertisingNetwork';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity} from '../../TestingUtils';

describe('InterplanetaryAdvertisingNetwork', () => {
  let card: InterplanetaryAdvertisingNetwork;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new InterplanetaryAdvertisingNetwork();
    [/* game */, player, player2] = testGame(2);
  });

  it('raises TR 1 step for each city the player owns on Mars', () => {
    const startingTr = player.terraformRating;
    addCity(player);
    addCity(player);
    addCity(player2);

    card.play(player);

    expect(player.terraformRating).to.eq(startingTr + 2);
  });

  it('scores 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
