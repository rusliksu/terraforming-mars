import {expect} from 'chai';
import {PlanetaryCoreInductor} from '../../../src/server/cards/solaris/PlanetaryCoreInductor';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setTemperature, testRedsCosts} from '../../TestingUtils';

describe('PlanetaryCoreInductor', () => {
  let card: PlanetaryCoreInductor;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PlanetaryCoreInductor();
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

  it('increases temperature 1 step on action', () => {
    const startingTemperature = player.game.getTemperature();
    expect(card.canAct(player)).is.true;
    card.action(player);
    expect(player.game.getTemperature()).to.eq(startingTemperature + 2);
  });

  it('scores 3 VP per Galactic tag owned, including this', () => {
    player.tagsForTest = {galactic: 1};
    expect(card.getVictoryPoints(player)).eq(6);
  });

  const redsRuns = [
    {temperature: 6, expected: 3},
    {temperature: 8, expected: 0},
  ] as const;

  for (const run of redsRuns) {
    it('Works with reds ' + JSON.stringify(run), () => {
      const [game, player] = testGame(1, {turmoilExtension: true});
      setTemperature(game, run.temperature);
      testRedsCosts(() => card.canAct(player), player, 0, run.expected);
    });
  }
});
