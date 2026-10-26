import {expect} from 'chai';
import {Cyborgs} from '../../../src/server/cards/solaris/Cyborgs';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, fakeCard} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';

describe('Cyborgs', () => {
  let card: Cyborgs;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new Cyborgs();
    restoreShuffle = forcePartiesInPlay(PartyName.TRANSHUMANISTS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('Cannot play without Transhumanists', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Transhumanists rule', () => {
    setRulingParty(game, PartyName.TRANSHUMANISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('play increases M€ production 1 step', () => {
    setRulingParty(game, PartyName.TRANSHUMANISTS);
    player.production.override({megacredits: 0});
    card.play(player);
    expect(player.production.megacredits).to.eq(1);
  });

  it('scores 1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('Wild tags count as any tag while Cyborgs is in play', () => {
    const wildCard = fakeCard({tags: [Tag.WILD]});

    expect(player.tags.cardHasTag(wildCard, Tag.SPACE)).is.false;
    expect(player.tags.cardTagCount(wildCard, Tag.SPACE)).to.eq(0);

    player.playedCards.push(card);

    expect(player.tags.cardHasTag(wildCard, Tag.SPACE)).is.true;
    expect(player.tags.cardHasTag(wildCard, Tag.EARTH)).is.true;
    expect(player.tags.cardTagCount(wildCard, Tag.SPACE)).to.eq(1);
  });
});
