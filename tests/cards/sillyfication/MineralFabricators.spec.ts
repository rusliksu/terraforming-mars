import {expect} from 'chai';
import {MineralFabricators} from '../../../src/server/cards/sillyfication/MineralFabricators';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('MineralFabricators', () => {
  let card: MineralFabricators;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MineralFabricators();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without energy production', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('trades energy production for steel and titanium production', () => {
    player.production.override({energy: 1});
    card.play(player);
    expect(player.production.energy).to.eq(0);
    expect(player.production.steel).to.eq(1);
    expect(player.production.titanium).to.eq(1);
  });
});
