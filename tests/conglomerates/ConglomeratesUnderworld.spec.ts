import {expect} from 'chai';
import {testGame} from '../TestGame';
import {TestPlayer} from '../TestPlayer';
import {LawSuit} from '../../src/server/cards/promo/LawSuit';

describe('Conglomerates Underworld corruption sharing', () => {
  let player1: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let baseline: number;

  beforeEach(() => {
    // player1 & player3 are a team; player2 & player4 are a team.
    [, player1, player2, player3] = testGame(4, {underworldExpansion: true, conglomeratesExpansion: true});
    baseline = player1.getVictoryPoints().total;
  });

  it('a teammate\'s leftover corruption covers negative VP the player can\'t cover themselves', () => {
    player1.playedCards.push(new LawSuit()); // -1 VP
    player1.underworldData.corruption = 0;
    expect(player1.getVictoryPoints().total).to.eq(baseline - 1);

    player3.underworldData.corruption = 2; // teammate has no negative VP of their own, all leftover
    expect(player1.getVictoryPoints().total).to.eq(baseline);
    // Corruption isn't consumed -- it's a live, recomputed bribe, not a one-time spend.
    expect(player3.underworldData.corruption).to.eq(2);
  });

  it('does not help beyond what the teammate has left after covering their own negative VP', () => {
    player1.playedCards.push(new LawSuit()); // player1: -1 VP, 0 corruption
    player3.playedCards.push(new LawSuit()); // player3: -1 VP of their own
    player3.underworldData.corruption = 1; // exactly covers player3's own bribe, nothing left

    expect(player1.getVictoryPoints().total).to.eq(baseline - 1);
  });

  it('caps the assist at how much negative VP is actually still uncovered', () => {
    player1.playedCards.push(new LawSuit()); // -1 VP, 0 own corruption
    player3.underworldData.corruption = 5; // far more leftover than player1 needs

    expect(player1.getVictoryPoints().total).to.eq(baseline);
  });

  it('does not share corruption across opposing teams', () => {
    player1.playedCards.push(new LawSuit()); // -1 VP, 0 own corruption
    player2.underworldData.corruption = 5; // plenty, but on the other team

    expect(player1.getVictoryPoints().total).to.eq(baseline - 1);
  });

  it('does not apply when Conglomerates is off', () => {
    const [, twoPlayer1, twoPlayer2] = testGame(2, {underworldExpansion: true});
    const twoBaseline = twoPlayer1.getVictoryPoints().total;
    twoPlayer1.playedCards.push(new LawSuit());
    twoPlayer2.underworldData.corruption = 5;

    expect(twoPlayer1.getVictoryPoints().total).to.eq(twoBaseline - 1);
  });
});
