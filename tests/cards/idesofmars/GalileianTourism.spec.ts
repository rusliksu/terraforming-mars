import {expect} from 'chai';
import {GalileianTourism} from '../../../src/server/cards/idesofmars/GalileianTourism';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('GalileianTourism', () => {
  let card: GalileianTourism;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GalileianTourism();
    [, player] = testGame(1);
  });

  it('cannot play without 2 Jovian tags', () => {
    player.tagsForTest = {jovian: 1};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 2 Jovian tags', () => {
    player.tagsForTest = {jovian: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production on play', () => {
    player.tagsForTest = {jovian: 2};
    card.play(player);
    expect(player.production.megacredits).to.eq(1);
  });

  it('scores 1 VP per Jovian tag owned', () => {
    // Push the card into the tableau first: victory-point tag counting adds this card's own
    // tag(s) only when it *isn't* already part of the player's tableau.
    player.playedCards.push(card);
    player.tagsForTest = {jovian: 4};
    expect(card.getVictoryPoints(player)).to.eq(4);
  });
});
