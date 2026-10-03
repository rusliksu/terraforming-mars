import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {GreatLighthouseOfAlbaPatera} from '../../../src/server/cards/robantilles/GreatLighthouseOfAlbaPatera';
import {TestPlayer} from '../../TestPlayer';

describe('GreatLighthouseOfAlbaPatera', () => {
  let card: GreatLighthouseOfAlbaPatera;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GreatLighthouseOfAlbaPatera();
    [, player] = testGame(2);
    // Push into the tableau so the Counter doesn't also add this card's own printed Power
    // tag on top of tagsForTest below (Counter only does that for an "unplayed" card).
    player.playedCards.push(card);
  });

  it('has no play-time requirements', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('scores 1 VP for every 2 Power tags the player has', () => {
    player.tagsForTest = {power: 0};
    expect(card.getVictoryPoints(player)).to.eq(0);

    player.tagsForTest = {power: 1};
    expect(card.getVictoryPoints(player)).to.eq(0);

    player.tagsForTest = {power: 2};
    expect(card.getVictoryPoints(player)).to.eq(1);

    player.tagsForTest = {power: 5};
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
