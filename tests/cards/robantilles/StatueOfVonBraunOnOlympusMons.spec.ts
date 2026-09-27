import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {StatueOfVonBraunOnOlympusMons} from '../../../src/server/cards/robantilles/StatueOfVonBraunOnOlympusMons';
import {TestPlayer} from '../../TestPlayer';

describe('StatueOfVonBraunOnOlympusMons', () => {
  let card: StatueOfVonBraunOnOlympusMons;
  let player: TestPlayer;

  beforeEach(() => {
    card = new StatueOfVonBraunOnOlympusMons();
    [, player] = testGame(2);
    // Push into the tableau so the Counter doesn't also add this card's own printed Space
    // tag on top of tagsForTest below (Counter only does that for an "unplayed" card).
    player.playedCards.push(card);
  });

  it('has no play-time requirements', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('scores 1 VP for every 2 Space tags the player has', () => {
    player.tagsForTest = {space: 0};
    expect(card.getVictoryPoints(player)).to.eq(0);

    player.tagsForTest = {space: 3};
    expect(card.getVictoryPoints(player)).to.eq(1);

    player.tagsForTest = {space: 4};
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
