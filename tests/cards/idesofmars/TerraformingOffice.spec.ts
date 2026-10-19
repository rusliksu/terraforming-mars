import {expect} from 'chai';
import {TerraformingOffice} from '../../../src/server/cards/idesofmars/TerraformingOffice';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('TerraformingOffice', () => {
  let card: TerraformingOffice;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS);
    card = new TerraformingOffice();
    [game, player] = testGame(2, {turmoilExtension: true, idesOfMarsExpansion: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without the Bureaucrats ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.BUREAUCRATS);
    expect(card.canPlay(player)).is.true;
  });

  it('action grants another action', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    card.play(player);
    player.playedCards.push(card);

    expect(card.canAct(player)).is.true;
    const before = player.availableActionsThisRound;
    card.action(player);
    expect(player.availableActionsThisRound).to.eq(before + 1);
  });
});
