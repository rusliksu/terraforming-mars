import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {setRulingParty} from '../../TestingUtils';
import {TharsisColossus} from '../../../src/server/cards/robantilles/TharsisColossus';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';

describe('TharsisColossus', () => {
  let card: TharsisColossus;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new TharsisColossus();
    [game, player] = testGame(2, {turmoilExtension: true});
    // Push into the tableau so the Counter doesn't also add this card's own printed Building
    // tag on top of tagsForTest below (Counter only does that for an "unplayed" card).
    player.playedCards.push(card);
  });

  it('cannot play without Mars First ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.MARS);
    expect(card.canPlay(player)).is.true;
  });

  it('scores 1 VP for every 3 Building tags the player has', () => {
    player.tagsForTest = {building: 2};
    expect(card.getVictoryPoints(player)).to.eq(0);

    player.tagsForTest = {building: 3};
    expect(card.getVictoryPoints(player)).to.eq(1);

    player.tagsForTest = {building: 8};
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
