import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {ThreePlanetsSystem} from '../../../src/server/cards/idesofmars/ThreePlanetsSystem';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {setOxygenLevel} from '../../TestingUtils';

describe('ThreePlanetsSystem', () => {
  let card: ThreePlanetsSystem;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ThreePlanetsSystem();
    [game, player] = testGame(1, {venusNextExtension: true});
  });

  it('requires at least 6% oxygen', () => {
    expect(card.canPlay(player)).is.false;
    setOxygenLevel(game, 6);
    expect(card.canPlay(player)).is.true;
  });

  it('raises Venus 1 step and increases plant production 1 step', () => {
    setOxygenLevel(game, 6);
    const startingVenus = game.getVenusScaleLevel();
    const startingPlants = player.production.plants;

    card.play(player);

    expect(game.getVenusScaleLevel()).to.eq(startingVenus + 2);
    expect(player.production.plants).to.eq(startingPlants + 1);
  });

  it('awards 1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
