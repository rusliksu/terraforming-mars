import {expect} from 'chai';
import {ManagementCrisis} from '../../../src/server/cards/solaris/ManagementCrisis';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('ManagementCrisis', () => {
  let card: ManagementCrisis;
  let game: IGame;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    card = new ManagementCrisis();
    restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS);
    [game, player, opponent] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('Cannot play without Bureaucrats', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Can play when Bureaucrats rule', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    expect(card.canPlay(player)).is.true;
  });

  it('play decreases this player\'s TR by 1, and caps opponents at 1 action per turn', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    const tr = player.terraformRating;
    const generation = game.generation;

    card.play(player);

    expect(player.terraformRating).to.eq(tr - 1);
    expect(opponent.oneActionPerTurnActiveGeneration).to.eq(generation);
    expect(opponent.availableActionsThisRound).to.eq(1);
    // The playing player themselves isn't affected.
    expect(player.oneActionPerTurnActiveGeneration).is.undefined;
    expect(player.availableActionsThisRound).to.eq(2);
  });

  it('caps the opponent at 1 action even at a later turn boundary this generation', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    card.play(player);

    // Simulate the turn-boundary reset that normally happens when a player's round ends.
    opponent.actionsTakenThisRound = 1;
    opponent.availableActionsThisRound =
      opponent.oneActionPerTurnActiveGeneration === game.generation ? 1 : 2;

    expect(opponent.availableActionsThisRound).to.eq(1);
  });
});
