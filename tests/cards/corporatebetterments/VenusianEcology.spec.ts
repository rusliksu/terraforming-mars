import {expect} from 'chai';
import {VenusianEcology} from '../../../src/server/cards/corporatebetterments/VenusianEcology';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {setVenusScaleLevel} from '../../TestingUtils';

describe('VenusianEcology', () => {
  let card: VenusianEcology;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new VenusianEcology();
    [game, player] = testGame(1, {venusNextExtension: true});
  });

  it('cannot play with Venus below 12%', () => {
    setVenusScaleLevel(game, 10);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with Venus at 12% or higher', () => {
    setVenusScaleLevel(game, 12);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without 3 plants', () => {
    player.plants = 2;
    expect(card.canAct(player)).is.false;
  });

  it('spends 3 plants to raise Venus 1 step', () => {
    setVenusScaleLevel(game, 12);
    player.plants = 3;
    expect(card.canAct(player)).is.true;

    card.action(player);
    expect(player.plants).eq(0);
    expect(player.game.getVenusScaleLevel()).eq(14);
  });

  it('scores a flat 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
