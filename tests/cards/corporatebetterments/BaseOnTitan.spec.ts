import {expect} from 'chai';
import {BaseOnTitan} from '../../../src/server/cards/corporatebetterments/BaseOnTitan';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('BaseOnTitan', () => {
  let card: BaseOnTitan;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BaseOnTitan();
    [, player] = testGame(1);
  });

  it('cannot play without 3 Jovian tags', () => {
    player.tagsForTest = {jovian: 2};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 3 Jovian tags', () => {
    player.tagsForTest = {jovian: 3};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without 2 titanium', () => {
    player.titanium = 1;
    expect(card.canAct(player)).is.false;
  });

  it('spends 2 titanium to raise terraform rating 1 step', () => {
    player.titanium = 2;
    expect(card.canAct(player)).is.true;

    const startingTr = player.terraformRating;
    card.action(player);
    expect(player.titanium).eq(0);
    expect(player.terraformRating).eq(startingTr + 1);
  });

  it('scores 1 VP per Jovian tag owned', () => {
    // Push the card into the tableau first: victory-point tag counting adds this card's own
    // tag(s) only when it *isn't* already part of the player's tableau.
    player.playedCards.push(card);
    player.tagsForTest = {jovian: 4};
    expect(card.getVictoryPoints(player)).eq(4);
  });
});
