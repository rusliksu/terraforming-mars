import {expect} from 'chai';
import {VenusEarthPartnership} from '../../../src/server/cards/corporatebetterments/VenusEarthPartnership';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('VenusEarthPartnership', () => {
  let card: VenusEarthPartnership;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusEarthPartnership();
    [, player] = testGame(1, {venusNextExtension: true});
  });

  it('cannot play without 3 Earth and 3 Venus tags', () => {
    player.tagsForTest = {earth: 3, venus: 2};
    expect(card.canPlay(player)).is.false;

    player.tagsForTest = {earth: 2, venus: 3};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 3 Earth and 3 Venus tags', () => {
    player.tagsForTest = {earth: 3, venus: 3};
    expect(card.canPlay(player)).is.true;
  });

  it('scores a flat 5 VP', () => {
    expect(card.getVictoryPoints(player)).eq(5);
  });
});
