import {expect} from 'chai';
import {FirstMissionToGanymede} from '../../../src/server/cards/sillyfication/FirstMissionToGanymede';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('FirstMissionToGanymede', () => {
  let card: FirstMissionToGanymede;
  let player: TestPlayer;

  beforeEach(() => {
    card = new FirstMissionToGanymede();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires at most 1 Jovian tag', () => {
    player.tagsForTest = {jovian: 1};
    expect(card.canPlay(player)).is.true;
    player.tagsForTest = {jovian: 2};
    expect(card.canPlay(player)).is.false;
  });

  it('scores 1 VP per 2 Jovian tags', () => {
    player.tagsForTest = {jovian: 4};
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
