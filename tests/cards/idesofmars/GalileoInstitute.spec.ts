import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {GalileoInstitute} from '../../../src/server/cards/idesofmars/GalileoInstitute';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {fakeCard} from '../../TestingUtils';

describe('GalileoInstitute', () => {
  let card: GalileoInstitute;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GalileoInstitute();
    [, player] = testGame(2);
  });

  it('cannot play without a science tag', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with a science tag', () => {
    player.tagsForTest = {science: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('is worth 2 victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('counts Jovian tags (including its own) as science tags once in play', () => {
    player.playedCards.push(fakeCard({tags: [Tag.JOVIAN, Tag.JOVIAN]}));

    expect(player.tags.count(Tag.SCIENCE, 'raw')).to.eq(0);
    expect(player.tags.count(Tag.SCIENCE)).to.eq(0);

    // Galileo Institute itself has a Jovian tag, so it also counts once it's in play.
    player.playedCards.push(card);

    expect(player.tags.count(Tag.SCIENCE, 'raw')).to.eq(0);
    expect(player.tags.count(Tag.SCIENCE)).to.eq(3);
  });

  it('does not count science tags as Jovian tags (one-directional)', () => {
    player.playedCards.push(card);
    const jovianTagsBefore = player.tags.count(Tag.JOVIAN);

    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE]}));

    expect(player.tags.count(Tag.JOVIAN)).to.eq(jovianTagsBefore);
  });
});
