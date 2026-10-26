import {expect} from 'chai';
import {CorruptedDelegate} from '../../../src/server/cards/robantilles/CorruptedDelegate';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('CorruptedDelegate', () => {
  let card: CorruptedDelegate;
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS);
    card = new CorruptedDelegate();
    [game, player] = testGame(2, {turmoilExtension: true, robAntillesExpansion: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without the Bureaucrats ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.BUREAUCRATS);
    expect(card.canPlay(player)).is.true;
  });

  it('grants 3 more actions this turn', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    const before = player.availableActionsThisRound;
    card.play(player);
    expect(player.availableActionsThisRound).to.eq(before + 3);
  });
});
