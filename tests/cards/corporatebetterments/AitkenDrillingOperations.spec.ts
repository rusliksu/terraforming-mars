import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {AitkenDrillingOperations} from '../../../src/server/cards/corporatebetterments/AitkenDrillingOperations';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('AitkenDrillingOperations', () => {
  let card: AitkenDrillingOperations;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AitkenDrillingOperations();
    [, player] = testGame(1);
  });

  it('cannot play without 5 Science tags', () => {
    player.tagsForTest = {science: 4};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 5 Science tags', () => {
    player.tagsForTest = {science: 5};
    expect(card.canPlay(player)).is.true;
  });

  it('increases steel production 3 steps on play', () => {
    player.tagsForTest = {science: 5};
    card.play(player);
    expect(player.production.steel).eq(3);
  });

  it('cannot act without any steel', () => {
    player.steel = 0;
    expect(card.canAct(player)).is.false;
  });

  it('converts any amount of steel to an equal amount of titanium', () => {
    player.steel = 5;
    expect(card.canAct(player)).is.true;

    const selectAmount = cast(card.action(player), SelectAmount);
    expect(selectAmount.min).eq(1);
    expect(selectAmount.max).eq(5);

    selectAmount.cb(3);
    expect(player.steel).eq(2);
    expect(player.titanium).eq(3);
  });

  it('scores a flat 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
