import {expect} from 'chai';
import {BiomassReactor} from '../../../src/server/cards/corporatebetterments/BiomassReactor';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Resource} from '../../../src/common/Resource';

describe('BiomassReactor', () => {
  let card: BiomassReactor;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BiomassReactor();
    [/* game */, player] = testGame(1);
  });

  it('cannot play without 2 plant tags', () => {
    player.tagsForTest = {plant: 1};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 2 plant tags', () => {
    player.tagsForTest = {plant: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('increases energy production 4 steps on play', () => {
    player.tagsForTest = {plant: 2};
    card.play(player);
    expect(player.production.energy).to.eq(4);
  });

  it('action converts energy production into plant production', () => {
    player.production.add(Resource.ENERGY, 2);
    expect(card.canAct(player)).is.true;

    card.action(player);

    expect(player.production.energy).to.eq(1);
    expect(player.production.plants).to.eq(1);
  });
});
