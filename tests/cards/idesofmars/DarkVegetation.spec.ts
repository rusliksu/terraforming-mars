import {expect} from 'chai';
import {DarkVegetation} from '../../../src/server/cards/idesofmars/DarkVegetation';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setOxygenLevel} from '../../TestingUtils';

describe('DarkVegetation', () => {
  let card: DarkVegetation;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new DarkVegetation();
    [game, player] = testGame(1);
    setOxygenLevel(game, 7);
  });

  it('cannot play below 7% oxygen', () => {
    setOxygenLevel(game, 6);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 7% oxygen', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('increases heat and plant production 1 step each with fewer than 3 plant tags', () => {
    player.tagsForTest = {plant: 1};
    card.play(player);

    expect(player.production.heat).to.eq(1);
    expect(player.production.plants).to.eq(1);
  });

  it('increases plant production 2 steps with 3 or more plant tags (including this card)', () => {
    player.tagsForTest = {plant: 2};
    card.play(player);

    expect(player.production.heat).to.eq(0);
    expect(player.production.plants).to.eq(2);
  });
});
