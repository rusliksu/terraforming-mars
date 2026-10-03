import {expect} from 'chai';
import {HelpRequest} from '../../../src/server/cards/conglomerates/HelpRequest';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';

describe('HelpRequest', () => {
  let card: HelpRequest;
  let player1: TestPlayer;
  let player3: TestPlayer;

  beforeEach(() => {
    card = new HelpRequest();
    // player1 & player3 are a team.
    [, player1, , player3] = testGame(4, {conglomeratesExpansion: true});
    player1.megaCredits = 7;
  });

  it('cannot play without a teammate', () => {
    const [, solo] = testGame(4);
    solo.megaCredits = 7;
    expect(card.canPlay(solo)).is.false;
  });

  it('cannot play without enough MC', () => {
    player1.megaCredits = 6;
    expect(player1.canPlay(card)).is.false;
  });

  it('gives the teammate 2 Coordination', () => {
    const before = player3.conglomeratesData.coordination;
    expect(card.canPlay(player1)).is.true;

    card.play(player1);

    expect(player3.conglomeratesData.coordination).to.eq(before + 2);
  });
});
