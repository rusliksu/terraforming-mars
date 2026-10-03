import {expect} from 'chai';
import {EnergyShortcut} from '../../../src/server/cards/idesofmars/EnergyShortcut';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('EnergyShortcut', () => {
  let card: EnergyShortcut;
  let player: TestPlayer;

  beforeEach(() => {
    card = new EnergyShortcut();
    [, player] = testGame(1);
  });

  it('cannot play without energy', () => {
    player.energy = 0;
    expect(card.canPlay(player)).is.false;
  });

  it('can play with energy', () => {
    player.energy = 3;
    expect(card.canPlay(player)).is.true;
  });

  it('converts all energy to heat', () => {
    player.energy = 4;
    player.heat = 1;

    card.play(player);

    expect(player.energy).to.eq(0);
    expect(player.heat).to.eq(5);
  });
});
