import {expect} from 'chai';
import {TaxTheRich} from '../../../src/server/cards/robantilles/TaxTheRich';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('TaxTheRich', () => {
  let card: TaxTheRich;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.POPULISTS);
    card = new TaxTheRich();
    [game, player, player2] = testGame(2, {turmoilExtension: true, robAntillesExpansion: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without the Populists ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.POPULISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('places itself in the chosen opponent\'s event pile and scores -2 VP against them', () => {
    setRulingParty(game, PartyName.POPULISTS);

    const selectPlayer = cast(card.play(player), SelectPlayer);
    selectPlayer.cb(player2);

    expect(player2.playedCards.has(card.name)).is.true;
    expect(player.playedCards.has(card.name)).is.false;
    expect(card.getVictoryPoints()).to.eq(-2);
  });
});
