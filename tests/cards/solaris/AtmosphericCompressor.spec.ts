import {expect} from 'chai';
import {AtmosphericCompressor} from '../../../src/server/cards/solaris/AtmosphericCompressor';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setOxygenLevel, testRedsCosts} from '../../TestingUtils';

describe('AtmosphericCompressor', () => {
  let card: AtmosphericCompressor;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AtmosphericCompressor();
    [, player] = testGame(1);
  });

  it('cannot play without 7 Space tags', () => {
    player.tagsForTest = {space: 6};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 7 Space tags', () => {
    player.tagsForTest = {space: 7};
    expect(card.canPlay(player)).is.true;
  });

  it('increases oxygen 1 step on action', () => {
    const startingOxygen = player.game.getOxygenLevel();
    expect(card.canAct(player)).is.true;
    card.action(player);
    expect(player.game.getOxygenLevel()).to.eq(startingOxygen + 1);
  });

  it('scores 3 VP per Galactic tag owned, including this', () => {
    // Not pushed into the tableau: getVictoryPoints() then adds this card's own Galactic tag
    // on top of tagsForTest, matching "including this" on an unplayed/in-hand card.
    player.tagsForTest = {galactic: 2};
    // 2 Galactic tags from other cards + this card's own Galactic tag = 3.
    expect(card.getVictoryPoints(player)).eq(9);
  });

  const redsRuns = [
    {oxygen: 12, expected: 3},
    {oxygen: 13, expected: 3},
    {oxygen: 14, expected: 0},
  ] as const;

  for (const run of redsRuns) {
    it('Works with reds ' + JSON.stringify(run), () => {
      const [game, player] = testGame(1, {turmoilExtension: true});
      setOxygenLevel(game, run.oxygen);
      testRedsCosts(() => card.canAct(player), player, 0, run.expected);
    });
  }
});
