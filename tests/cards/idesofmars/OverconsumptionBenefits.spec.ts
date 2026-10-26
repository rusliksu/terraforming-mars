import {expect} from 'chai';
import {OverconsumptionBenefits} from '../../../src/server/cards/idesofmars/OverconsumptionBenefits';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity} from '../../TestingUtils';

describe('OverconsumptionBenefits', () => {
  let card: OverconsumptionBenefits;
  let player: TestPlayer;

  beforeEach(() => {
    card = new OverconsumptionBenefits();
    [, player] = testGame(1);
  });

  it('cannot play without 2 Power tags', () => {
    player.tagsForTest = {power: 1};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {power: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('increases heat production 1 step for each city on Mars', () => {
    addCity(player);
    addCity(player);

    card.play(player);

    expect(player.production.heat).eq(2);
  });

  it('has no heat production bonus without any cities', () => {
    card.play(player);
    expect(player.production.heat).eq(0);
  });
});
