import {expect} from 'chai';
import {GasTurbines} from '../../../src/server/cards/venusPhase2/GasTurbines';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {setVenusScaleLevel} from '../../TestingUtils';

describe('GasTurbines', () => {
  let card: GasTurbines;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GasTurbines();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('increases energy production 1 step for every 10% of Venus reached', () => {
    setVenusScaleLevel(game, 24);
    card.play(player);
    expect(player.production.energy).to.eq(2);
  });

  it('grants no energy production below 10%', () => {
    setVenusScaleLevel(game, 9);
    card.play(player);
    expect(player.production.energy).to.eq(0);
  });
});
