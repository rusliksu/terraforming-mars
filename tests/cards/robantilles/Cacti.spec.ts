import {expect} from 'chai';
import {Cacti} from '../../../src/server/cards/robantilles/Cacti';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {setTemperature} from '../../TestingUtils';

describe('Cacti', () => {
  let card: Cacti;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Cacti();
    [game, player] = testGame(1);
  });

  it('cannot play below +8 C', () => {
    setTemperature(game, 6);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at +8 C or warmer', () => {
    setTemperature(game, 8);
    expect(card.canPlay(player)).is.true;
  });

  it('increases plant production by 1', () => {
    setTemperature(game, 8);
    card.play(player);
    expect(player.production.plants).to.eq(1);
  });
});
