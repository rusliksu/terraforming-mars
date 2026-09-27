import {expect} from 'chai';
import {SpaceTelescope} from '../../../src/server/cards/solaris/SpaceTelescope';
import {Fish} from '../../../src/server/cards/base/Fish';
import {ImportedHydrogen} from '../../../src/server/cards/base/ImportedHydrogen';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('SpaceTelescope', () => {
  let card: SpaceTelescope;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SpaceTelescope();
    [, player] = testGame(1);
    player.playedCards.push(card);
  });

  it('cannot play without 1 Science tag', () => {
    player.tagsForTest = {science: 0};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 1 Science tag', () => {
    player.tagsForTest = {science: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('adds 1 data when a Space event is played', () => {
    expect(card.resourceCount).to.eq(0);
    card.onCardPlayed(player, new ImportedHydrogen()); // event with earth/space tags
    expect(card.resourceCount).to.eq(1);
  });

  it('ignores non-event Space cards', () => {
    card.onCardPlayed(player, new Fish()); // active card, no space tag either
    expect(card.resourceCount).to.eq(0);
  });

  it('scores 1 VP per 2 data on this card', () => {
    card.resourceCount = 5;
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
