import {expect} from 'chai';
import {MarsAcademyOfPoliticalSciences} from '../../../src/server/cards/solaris/MarsAcademyOfPoliticalSciences';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';

describe('MarsAcademyOfPoliticalSciences', () => {
  let card: MarsAcademyOfPoliticalSciences;
  let game: IGame;
  let player: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.CENTRISTS);
    card = new MarsAcademyOfPoliticalSciences();
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Centrists ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.CENTRISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('raises TR 1 step on play', () => {
    setRulingParty(game, PartyName.CENTRISTS);
    const trBefore = player.terraformRating;
    card.play(player);
    expect(player.terraformRating).to.eq(trBefore + 1);
  });

  it('grants +2 influence while in play', () => {
    const turmoil = Turmoil.getTurmoil(game);
    const influenceBefore = turmoil.getInfluence(player);

    player.playedCards.push(card);
    expect(turmoil.getInfluence(player)).to.eq(influenceBefore + 2);

    player.playedCards.remove(card);
    expect(turmoil.getInfluence(player)).to.eq(influenceBefore);
  });
});
