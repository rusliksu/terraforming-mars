import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {BioBatteries} from '../../../src/server/cards/idesofmars/BioBatteries';
import {TestPlayer} from '../../TestPlayer';

describe('BioBatteries', () => {
  let card: BioBatteries;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BioBatteries();
    [/* game */, player] = testGame(1);
  });

  it('cannot play without 4 plants', () => {
    player.plants = 3;
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 4 plants', () => {
    player.plants = 4;
    expect(card.canPlay(player)).is.true;
  });

  it('spends 4 plants and increases energy production 2 steps on play', () => {
    player.plants = 6;
    const energy = player.production.energy;

    card.play(player);

    expect(player.plants).to.eq(2);
    expect(player.production.energy).to.eq(energy + 2);
  });
});
