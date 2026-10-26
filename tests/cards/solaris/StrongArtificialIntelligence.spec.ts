import {expect} from 'chai';
import {StrongArtificialIntelligence} from '../../../src/server/cards/solaris/StrongArtificialIntelligence';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, fakeCard} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';

describe('StrongArtificialIntelligence', () => {
  let card: StrongArtificialIntelligence;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new StrongArtificialIntelligence();
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

  it('play gains 1 M€', () => {
    setRulingParty(game, PartyName.TRANSHUMANISTS);
    player.megaCredits = 0;
    card.play(player);
    expect(player.megaCredits).to.eq(1);
  });

  it('Wild tags count as any tag while Strong Artificial Intelligence is in play', () => {
    const wildCard = fakeCard({tags: [Tag.WILD]});

    expect(player.tags.cardHasTag(wildCard, Tag.PLANT)).is.false;

    player.playedCards.push(card);

    expect(player.tags.cardHasTag(wildCard, Tag.PLANT)).is.true;
    expect(player.tags.cardTagCount(wildCard, Tag.PLANT)).to.eq(1);
  });
});
