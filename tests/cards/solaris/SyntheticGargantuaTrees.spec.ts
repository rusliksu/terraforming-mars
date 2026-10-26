import {expect} from 'chai';
import {SyntheticGargantuaTrees} from '../../../src/server/cards/solaris/SyntheticGargantuaTrees';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('SyntheticGargantuaTrees', () => {
  let card: SyntheticGargantuaTrees;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SyntheticGargantuaTrees();
    [game, player] = testGame(1);
  });

  it('cannot play without 5 Plant tags', () => {
    player.tagsForTest = {plant: 4};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 5 Plant tags', () => {
    player.tagsForTest = {plant: 5};
    expect(card.canPlay(player)).is.true;
  });

  it('places a greenery tile without raising oxygen', () => {
    const startingOxygen = game.getOxygenLevel();
    const greeneriesBefore = game.board.getGreeneries().length;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(game.board.getGreeneries()).has.lengthOf(greeneriesBefore + 1);
    expect(game.getOxygenLevel()).to.eq(startingOxygen);
  });

  it('scores 3 VP per Galactic tag owned, including this', () => {
    player.tagsForTest = {galactic: 1};
    expect(card.getVictoryPoints(player)).eq(6);
  });
});
