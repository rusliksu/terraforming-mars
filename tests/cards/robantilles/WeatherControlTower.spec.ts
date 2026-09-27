import {expect} from 'chai';
import {WeatherControlTower} from '../../../src/server/cards/robantilles/WeatherControlTower';
import {testGame} from '../../TestGame';
import {addGreenery, setOxygenLevel} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';

describe('WeatherControlTower', () => {
  let card: WeatherControlTower;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new WeatherControlTower();
    [game, player, opponent] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot play with oxygen below 6%', () => {
    setOxygenLevel(game, 5);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with oxygen at 6% or above', () => {
    setOxygenLevel(game, 6);
    expect(card.canPlay(player)).is.true;
  });

  it('gains 2 M€ when any player places a greenery', () => {
    expect(player.megaCredits).to.eq(0);
    addGreenery(player);
    expect(player.megaCredits).to.eq(2);

    addGreenery(opponent);
    expect(player.megaCredits).to.eq(4);
  });
});
