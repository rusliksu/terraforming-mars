import {expect} from 'chai';
import {ArtificialMoon} from '../../../src/server/cards/solaris/ArtificialMoon';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('ArtificialMoon', () => {
  let card: ArtificialMoon;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ArtificialMoon();
    [game, player] = testGame(1);
  });

  it('cannot play without 6 Earth tags', () => {
    player.tagsForTest = {earth: 5};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 6 Earth tags', () => {
    player.tagsForTest = {earth: 6};
    expect(card.canPlay(player)).is.true;
  });

  it('draws 4 cards on action', () => {
    player.cardsInHand = [];
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.cardsInHand).has.lengthOf(4);
  });

  it('scores 3 VP per Galactic tag owned, including this', () => {
    // Not pushed into the tableau: getVictoryPoints() then adds this card's own Galactic tag
    // on top of tagsForTest, matching "including this" on an unplayed/in-hand card.
    player.tagsForTest = {galactic: 5};
    expect(card.getVictoryPoints(player)).eq(18);
  });
});
