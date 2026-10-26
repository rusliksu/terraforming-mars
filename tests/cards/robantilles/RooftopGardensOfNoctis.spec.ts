import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {addCity} from '../../TestingUtils';
import {RooftopGardensOfNoctis} from '../../../src/server/cards/robantilles/RooftopGardensOfNoctis';
import {TestPlayer} from '../../TestPlayer';

describe('RooftopGardensOfNoctis', () => {
  let card: RooftopGardensOfNoctis;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new RooftopGardensOfNoctis();
    [, player, player2] = testGame(2);
  });

  it('increases plant production 1 step on play', () => {
    card.play(player);
    expect(player.production.plants).to.eq(1);
  });

  it('scores 1 VP for each city tile the player owns on Mars', () => {
    expect(card.getVictoryPoints(player)).to.eq(0);

    addCity(player);
    expect(card.getVictoryPoints(player)).to.eq(1);

    addCity(player);
    expect(card.getVictoryPoints(player)).to.eq(2);

    // Opponent's cities don't count.
    addCity(player2);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
