import {expect} from 'chai';
import {testGame} from '../TestGame';
import {ConglomeratesExpansion} from '../../src/server/conglomerates/ConglomeratesExpansion';
import {CardName} from '../../src/common/cards/CardName';

describe('ConglomeratesExpansion', () => {
  describe('the 3 Team Action standard projects', () => {
    const TEAM_ACTION_NAMES = [CardName.GIVE_PATENT, CardName.FACILITY_SHARING, CardName.TEAM_DONATION];

    it('are not offered as standard projects when Conglomerates is off', () => {
      const [game] = testGame(4);
      const names = game.getStandardProjects().map((card) => card.name);
      for (const name of TEAM_ACTION_NAMES) {
        expect(names).to.not.include(name);
      }
    });

    it('are offered as standard projects when Conglomerates is on', () => {
      const [game] = testGame(4, {conglomeratesExpansion: true});
      const names = game.getStandardProjects().map((card) => card.name);
      for (const name of TEAM_ACTION_NAMES) {
        expect(names).to.include(name);
      }
    });

    it('are grouped together, adjacent, in the standard projects list', () => {
      // Regression: getStandardProjects() sorts by M€ cost, and Give Patent/Facility Access
      // are both 0 M€ -- the same cost as e.g. Collusion Standard Project -- so a plain
      // cost-sort could scatter the 3 Team Actions among unrelated same-cost projects instead
      // of keeping them together as the one related group they actually are.
      const [game] = testGame(4, {conglomeratesExpansion: true, underworldExpansion: true, turmoilExtension: true});
      const names = game.getStandardProjects().map((card) => card.name);
      const indices = TEAM_ACTION_NAMES.map((name) => names.indexOf(name));
      expect(indices.every((i) => i >= 0)).is.true;
      const sortedIndices = [...indices].sort((a, b) => a - b);
      expect(indices).to.deep.eq(sortedIndices, 'expected to already be in ascending order');
      expect(sortedIndices[2] - sortedIndices[0]).to.eq(2, 'expected the 3 to be consecutive');
    });

    it('always shows each Team Action\'s actual current Coordination cost, not just its unescalated base render', () => {
      const [, player1] = testGame(4, {conglomeratesExpansion: true});
      const givePatent = () => player1.getStandardProjectOption().cards.find((c) => c.name === CardName.GIVE_PATENT)!;

      expect(givePatent().additionalProjectCosts?.conglomeratesCost).to.eq(2);

      ConglomeratesExpansion.increaseTeamActionCost(player1, 'givePatent');
      expect(givePatent().additionalProjectCosts?.conglomeratesCost).to.eq(3);
    });

    it('are not offered in a player\'s action list when Conglomerates is off', () => {
      const [, player1] = testGame(4);
      const options = player1.getStandardProjectOption().cards.map((card) => card.name);
      for (const name of TEAM_ACTION_NAMES) {
        expect(options).to.not.include(name);
      }
    });
  });

  it('pairs a 4-player game into two teams by table order', () => {
    const [, player1, player2, player3, player4] = testGame(4, {conglomeratesExpansion: true});

    expect(player1.teammates().map((p) => p.id)).to.deep.eq([player3.id]);
    expect(player3.teammates().map((p) => p.id)).to.deep.eq([player1.id]);
    expect(player2.teammates().map((p) => p.id)).to.deep.eq([player4.id]);
    expect(player4.teammates().map((p) => p.id)).to.deep.eq([player2.id]);
  });

  it('has no teammates when Conglomerates is off', () => {
    const [, player1] = testGame(4);
    expect(player1.teammates()).to.be.empty;
  });

  it('uses explicit team assignments from game creation instead of table order, when given', () => {
    const [, player1, player2, player3, player4] = testGame(4, {
      conglomeratesExpansion: true,
      conglomeratesTeamAssignments: [0, 0, 1, 1],
    });

    expect(player1.teammates().map((p) => p.id)).to.deep.eq([player2.id]);
    expect(player2.teammates().map((p) => p.id)).to.deep.eq([player1.id]);
    expect(player3.teammates().map((p) => p.id)).to.deep.eq([player4.id]);
    expect(player4.teammates().map((p) => p.id)).to.deep.eq([player3.id]);
  });

  it('leaves a player with a unique team assignment teamless', () => {
    const [, player1, player2, player3, player4] = testGame(4, {
      conglomeratesExpansion: true,
      conglomeratesTeamAssignments: [0, 1, 2, 2],
    });

    expect(player1.teammates()).to.be.empty;
    expect(player2.teammates()).to.be.empty;
    expect(player3.teammates().map((p) => p.id)).to.deep.eq([player4.id]);
  });

  it('keeps team-index 0 mapped to team-assignment value 0 regardless of which team appears first in the player array', () => {
    // Regression: teams used to be built in Map-insertion order (whichever team-assignment
    // value was encountered first while iterating `players`), not by the assignment value
    // itself -- so when team 1's player happened to appear before team 0's (exactly what
    // Random First Player's rotation can now do), the resulting internal teams[0]/teams[1]
    // could end up swapped relative to what the Create Game form calls "Team 1"/"Team 2",
    // silently swapping teamDisplayColor's fixed orange/purple between the two teams.
    const [, player1, player2, player3, player4] = testGame(4, {
      conglomeratesExpansion: true,
      // Team-assignment value 1 appears at index 0 (before value 0 at index 1).
      conglomeratesTeamAssignments: [1, 0, 1, 0],
    });

    expect(ConglomeratesExpansion.teamDisplayColor(player2)).to.eq('orange');
    expect(ConglomeratesExpansion.teamDisplayColor(player4)).to.eq('orange');
    expect(ConglomeratesExpansion.teamDisplayColor(player1)).to.eq('purple');
    expect(ConglomeratesExpansion.teamDisplayColor(player3)).to.eq('purple');
  });

  it('falls back to table-order pairing when team assignments are the wrong length', () => {
    const [, player1, player2, player3, player4] = testGame(4, {
      conglomeratesExpansion: true,
      conglomeratesTeamAssignments: [0, 1],
    });

    expect(player1.teammates().map((p) => p.id)).to.deep.eq([player3.id]);
    expect(player2.teammates().map((p) => p.id)).to.deep.eq([player4.id]);
  });

  it('grants 2 coordination at game start', () => {
    const [, player1] = testGame(4, {conglomeratesExpansion: true});
    expect(player1.conglomeratesData.coordination).to.eq(2);
  });

  it('grants 2 coordination per player at the start of each generation', () => {
    const [, player1] = testGame(4, {conglomeratesExpansion: true});
    player1.runProductionPhase();
    expect(player1.conglomeratesData.coordination).to.eq(4);
    player1.runProductionPhase();
    expect(player1.conglomeratesData.coordination).to.eq(6);
  });

  it('does not grant any coordination when Conglomerates is off', () => {
    const [, player1] = testGame(4);
    expect(player1.conglomeratesData.coordination).to.eq(0);
    player1.runProductionPhase();
    expect(player1.conglomeratesData.coordination).to.eq(0);
  });

  it('escalates a team action cost only for the player who used it, not their teammate', () => {
    const [, player1, , player3] = testGame(4, {conglomeratesExpansion: true});
    expect(ConglomeratesExpansion.getTeamActionCost(player1, 'givePatent')).to.eq(2);
    expect(ConglomeratesExpansion.getTeamActionCost(player3, 'givePatent')).to.eq(2);
    ConglomeratesExpansion.increaseTeamActionCost(player1, 'givePatent');
    expect(ConglomeratesExpansion.getTeamActionCost(player1, 'givePatent')).to.eq(3);
    expect(ConglomeratesExpansion.getTeamActionCost(player3, 'givePatent')).to.eq(2);
  });

  it('resets an escalated team action cost back to base at the start of the next generation', () => {
    const [, player1] = testGame(4, {conglomeratesExpansion: true});
    ConglomeratesExpansion.increaseTeamActionCost(player1, 'givePatent');
    expect(ConglomeratesExpansion.getTeamActionCost(player1, 'givePatent')).to.eq(3);
    player1.runProductionPhase();
    expect(ConglomeratesExpansion.getTeamActionCost(player1, 'givePatent')).to.eq(2);
  });
});
