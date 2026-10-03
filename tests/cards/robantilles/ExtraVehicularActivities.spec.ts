import {expect} from 'chai';
import {ExtraVehicularActivities} from '../../../src/server/cards/robantilles/ExtraVehicularActivities';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Tag} from '../../../src/common/cards/Tag';

describe('ExtraVehicularActivities', () => {
  let card: ExtraVehicularActivities;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ExtraVehicularActivities();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without 2 Space tags', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.not.true;
  });

  it('increases M€ production 2 steps on play', () => {
    player.tagsForTest = {[Tag.SPACE]: 2};
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
    card.play(player);
    expect(player.production.megacredits).to.eq(2);
  });
});
