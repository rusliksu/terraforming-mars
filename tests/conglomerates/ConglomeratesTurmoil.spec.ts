import {expect} from 'chai';
import {testGame} from '../TestGame';
import {TestPlayer} from '../TestPlayer';
import {IGame} from '../../src/server/IGame';
import {Phase} from '../../src/common/Phase';
import {PartyName} from '../../src/common/turmoil/PartyName';
import {Turmoil} from '../../src/server/turmoil/Turmoil';
import {ConglomeratesExpansion} from '../../src/server/conglomerates/ConglomeratesExpansion';
import {PartyRequirement} from '../../src/server/cards/requirements/PartyRequirement';

describe('Conglomerates Turmoil', () => {
  let game: IGame;
  let player1: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let player4: TestPlayer;
  let turmoil: Turmoil;

  beforeEach(() => {
    // player1 & player3 are a team; player2 & player4 are a team.
    [game, player1, player2, player3, player4] = testGame(4, {turmoilExtension: true, conglomeratesExpansion: true});
    game.phase = Phase.ACTION;
    turmoil = Turmoil.getTurmoil(game);
    turmoil.parties.forEach((party) => party.delegates.clear());
  });

  describe('teamDisplayColor', () => {
    it('assigns team 1 orange and team 2 purple, fixed regardless of the players\' own colors', () => {
      const teamAColor = ConglomeratesExpansion.teamDisplayColor(player1);
      const teamBColor = ConglomeratesExpansion.teamDisplayColor(player2);

      expect(teamAColor).to.eq('orange');
      expect(teamBColor).to.eq('purple');
      expect(ConglomeratesExpansion.teamDisplayColor(player3)).to.eq(teamAColor);
      expect(ConglomeratesExpansion.teamDisplayColor(player4)).to.eq(teamBColor);
    });

    it('returns undefined for a teamless player or when Conglomerates is off', () => {
      const [, solo] = testGame(4, {turmoilExtension: true});
      expect(ConglomeratesExpansion.teamDisplayColor(solo)).is.undefined;
    });
  });

  describe('rewardRulingTeam', () => {
    it('gives both members 1 Coordination and the team 1 VP when they hold a strict plurality', () => {
      const party = turmoil.getPartyByName(PartyName.GREENS);
      turmoil.sendDelegateToParty(player1, PartyName.GREENS, game);
      turmoil.sendDelegateToParty(player3, PartyName.GREENS, game);
      turmoil.sendDelegateToParty(player2, PartyName.GREENS, game);

      const team = ConglomeratesExpansion.getTeam(player1)!;
      const otherTeam = ConglomeratesExpansion.getTeam(player2)!;
      player1.conglomeratesData.coordination = 0;
      player3.conglomeratesData.coordination = 0;
      player2.conglomeratesData.coordination = 0;

      ConglomeratesExpansion.rewardRulingTeam(game, party);

      expect(player1.conglomeratesData.coordination).to.eq(1);
      expect(player3.conglomeratesData.coordination).to.eq(1);
      expect(player2.conglomeratesData.coordination).to.eq(0);
      expect(team.bonusVictoryPoints).to.eq(1);
      expect(otherTeam.bonusVictoryPoints).to.eq(0);
    });

    it('rewards no one when two teams are tied', () => {
      const party = turmoil.getPartyByName(PartyName.GREENS);
      turmoil.sendDelegateToParty(player1, PartyName.GREENS, game);
      turmoil.sendDelegateToParty(player2, PartyName.GREENS, game);

      const team = ConglomeratesExpansion.getTeam(player1)!;
      const otherTeam = ConglomeratesExpansion.getTeam(player2)!;

      ConglomeratesExpansion.rewardRulingTeam(game, party);

      expect(team.bonusVictoryPoints).to.eq(0);
      expect(otherTeam.bonusVictoryPoints).to.eq(0);
    });

    it('does nothing for an empty or all-neutral party', () => {
      const party = turmoil.getPartyByName(PartyName.GREENS);
      turmoil.sendDelegateToParty('NEUTRAL', PartyName.GREENS, game);
      expect(() => ConglomeratesExpansion.rewardRulingTeam(game, party)).to.not.throw();
    });
  });

  describe('Turmoil.setRulingParty integration', () => {
    it('applies the team reward when a Conglomerates team wins the new ruling party', () => {
      turmoil.sendDelegateToParty(player1, PartyName.GREENS, game);
      turmoil.sendDelegateToParty(player3, PartyName.GREENS, game);
      turmoil.dominantParty = turmoil.getPartyByName(PartyName.GREENS);
      player1.conglomeratesData.coordination = 0;
      player3.conglomeratesData.coordination = 0;

      turmoil.setRulingParty(game);

      expect(player1.conglomeratesData.coordination).to.eq(1);
      expect(player3.conglomeratesData.coordination).to.eq(1);
    });
  });

  describe('PartyRequirement', () => {
    it('raises the minimum to 3 and counts a teammate\'s delegates toward it', () => {
      const requirement = new PartyRequirement(PartyName.REDS);
      turmoil.sendDelegateToParty(player1, PartyName.REDS, game);
      turmoil.sendDelegateToParty(player3, PartyName.REDS, game);
      expect(requirement.satisfies(player1)).is.false;

      turmoil.sendDelegateToParty(player3, PartyName.REDS, game);
      expect(requirement.satisfies(player1)).is.true;
    });

    it('does not count an opposing team\'s delegates', () => {
      const requirement = new PartyRequirement(PartyName.REDS);
      turmoil.sendDelegateToParty(player1, PartyName.REDS, game);
      turmoil.sendDelegateToParty(player2, PartyName.REDS, game);
      turmoil.sendDelegateToParty(player2, PartyName.REDS, game);
      expect(requirement.satisfies(player1)).is.false;
    });

    it('still applies the raised minimum to a teamless player in a Conglomerates game', () => {
      // With 3 players, seats 0&1 pair up (Phase 1's table-order pairing) and seat 2 is teamless.
      const [threeGame, , , solo] = testGame(3, {turmoilExtension: true, conglomeratesExpansion: true});
      const soloTurmoil = Turmoil.getTurmoil(threeGame);
      soloTurmoil.parties.forEach((party) => party.delegates.clear());
      expect(solo.teammates()).is.empty;

      const requirement = new PartyRequirement(PartyName.REDS);
      soloTurmoil.sendDelegateToParty(solo, PartyName.REDS, threeGame);
      soloTurmoil.sendDelegateToParty(solo, PartyName.REDS, threeGame);
      expect(requirement.satisfies(solo)).is.false;
    });

    it('uses the base 2-delegate minimum when Conglomerates is off', () => {
      const [twoGame, twoPlayer1] = testGame(2, {turmoilExtension: true});
      const twoTurmoil = Turmoil.getTurmoil(twoGame);
      twoTurmoil.parties.forEach((party) => party.delegates.clear());
      const requirement = new PartyRequirement(PartyName.REDS);
      twoTurmoil.sendDelegateToParty(twoPlayer1, PartyName.REDS, twoGame);
      twoTurmoil.sendDelegateToParty(twoPlayer1, PartyName.REDS, twoGame);
      expect(requirement.satisfies(twoPlayer1)).is.true;
    });
  });
});
