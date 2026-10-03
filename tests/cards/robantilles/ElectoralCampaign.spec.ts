import {expect} from 'chai';
import {ElectoralCampaign} from '../../../src/server/cards/robantilles/ElectoralCampaign';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('ElectoralCampaign', () => {
  let card: ElectoralCampaign;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.CENTRISTS);
    card = new ElectoralCampaign();
    [game, player, player2] = testGame(2, {turmoilExtension: true, robAntillesExpansion: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without the Centrists ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.CENTRISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('raises every player\'s TR 1 step and gives the acting player 7 M€', () => {
    setRulingParty(game, PartyName.CENTRISTS);
    const playerTr = player.terraformRating;
    const player2Tr = player2.terraformRating;

    card.play(player);

    expect(player.terraformRating).to.eq(playerTr + 1);
    expect(player2.terraformRating).to.eq(player2Tr + 1);
    expect(player.megaCredits).to.eq(7);
  });
});
