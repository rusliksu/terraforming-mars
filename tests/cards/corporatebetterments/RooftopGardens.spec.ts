import {expect} from 'chai';
import {RooftopGardens} from '../../../src/server/cards/corporatebetterments/RooftopGardens';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {addCity, addOcean, setOxygenLevel} from '../../TestingUtils';

describe('RooftopGardens', () => {
  let card: RooftopGardens;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new RooftopGardens();
    [game, player, player2] = testGame(2);
  });

  it('cannot play below 5% oxygen', () => {
    setOxygenLevel(game, 4);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 5% oxygen', () => {
    setOxygenLevel(game, 5);
    expect(card.canPlay(player)).is.true;
  });

  it('gains 2 plants whenever any player places a city tile', () => {
    player.playedCards.push(card);
    expect(player.plants).to.eq(0);

    addCity(player);
    expect(player.plants).to.eq(2);

    addCity(player2);
    expect(player.plants).to.eq(4);
  });

  it('does not trigger for non-city tiles', () => {
    player.playedCards.push(card);
    addOcean(player);
    expect(player.plants).to.eq(0);
  });
});
