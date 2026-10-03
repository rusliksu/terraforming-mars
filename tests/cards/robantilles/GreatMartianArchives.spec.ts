import {expect} from 'chai';
import {GreatMartianArchives} from '../../../src/server/cards/robantilles/GreatMartianArchives';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';

describe('GreatMartianArchives', () => {
  let card: GreatMartianArchives;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.TRANSHUMANISTS);
    card = new GreatMartianArchives();
    [game, player] = testGame(2, {turmoilExtension: true, robAntillesExpansion: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without the Transhumanists ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.TRANSHUMANISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('counts as every tag and stacks with the ruling policy', () => {
    setRulingParty(game, PartyName.TRANSHUMANISTS, 'trap02');
    player.playedCards.push(card);

    expect(player.tags.count(Tag.SCIENCE)).to.eq(1);
    expect(player.tags.count(Tag.EARTH)).to.eq(1);
    expect(player.tags.count(Tag.BUILDING)).to.eq(1);

    setRulingParty(game, PartyName.TRANSHUMANISTS, 'trap01');

    expect(player.tags.count(Tag.SCIENCE)).to.eq(2);
    expect(player.tags.count(Tag.EARTH)).to.eq(2);
    expect(player.tags.count(Tag.BUILDING)).to.eq(2);
  });
});
