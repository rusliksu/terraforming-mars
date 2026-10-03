import {expect} from 'chai';
import {testGame} from '../TestGame';
import {TestPlayer} from '../TestPlayer';
import {IGame} from '../../src/server/IGame';
import {Terraformer} from '../../src/server/milestones/Terraformer';
import {Banker} from '../../src/server/awards/Banker';
import {Resource} from '../../src/common/Resource';
import {ConglomeratesExpansion} from '../../src/server/conglomerates/ConglomeratesExpansion';

describe('Conglomerates team score', () => {
  let game: IGame;
  let player1: TestPlayer;
  let player3: TestPlayer;

  beforeEach(() => {
    // player1 & player3 are a team; player2 & player4 are a team.
    [game, player1, , player3] = testGame(4, {conglomeratesExpansion: true});
  });

  it('sums both members\' personal VP with no milestone/award double-counting', () => {
    player1.setTerraformRating(20);
    player3.setTerraformRating(15);
    // No milestones or awards claimed yet -- personal totals should just add up.
    const team = ConglomeratesExpansion.getTeam(player1)!;
    const breakdown = ConglomeratesExpansion.calculateTeamVictoryPoints(game, team);

    expect(breakdown.milestones).to.eq(0);
    expect(breakdown.awards).to.eq(0);
    expect(breakdown.bonuses).to.eq(0);
    expect(breakdown.players).to.eq(player1.getVictoryPoints().total + player3.getVictoryPoints().total);
    expect(breakdown.total).to.eq(breakdown.players);
  });

  it('counts claimed-milestone VP once at the team level, not on either member\'s own score', () => {
    const milestone = new Terraformer();
    player1.setTerraformRating(53);
    game.claimedMilestones.push({player: player1, milestone});

    const team = ConglomeratesExpansion.getTeam(player1)!;
    const breakdown = ConglomeratesExpansion.calculateTeamVictoryPoints(game, team);

    // Milestone VP is team-only -- neither member's own getVictoryPoints() includes it, so
    // the team total is simply the sum of both members' own totals plus the milestone VP.
    expect(breakdown.milestones).to.eq(8);
    expect(breakdown.total).to.eq(player1.getVictoryPoints().total + player3.getVictoryPoints().total + 8);
  });

  it('counts won-award VP once at the team level, not on either member\'s own score', () => {
    const award = new Banker();
    game.fundAward(player1, award);
    player1.production.add(Resource.MEGACREDITS, 5);
    player3.production.add(Resource.MEGACREDITS, 5);

    const team = ConglomeratesExpansion.getTeam(player1)!;
    const breakdown = ConglomeratesExpansion.calculateTeamVictoryPoints(game, team);

    // Award VP is team-only too -- same reasoning as milestones, above.
    expect(breakdown.awards).to.eq(8);
    expect(breakdown.total).to.eq(player1.getVictoryPoints().total + player3.getVictoryPoints().total + 8);
  });

  it('builds a live model for every team with names, colors, and a breakdown', () => {
    const models = ConglomeratesExpansion.getTeamModels(game);
    expect(models).to.have.length(2);

    const team1 = models.find((t) => t.playerIds.includes(player1.id))!;
    expect(team1.playerIds.sort()).to.deep.eq([player1.id, player3.id].sort());
    expect(team1.playerColors).to.deep.eq([player1.color, player3.color]);
    expect(team1.teamColor).to.eq(ConglomeratesExpansion.teamDisplayColor(player1));
    expect(team1.name).to.eq(`${player1.name} & ${player3.name}`);
    expect(team1.victoryPoints.total).to.eq(player1.getVictoryPoints().total + player3.getVictoryPoints().total);
    expect(team1.memberScores.sort()).to.deep.eq(
      [player1.getVictoryPoints().total, player3.getVictoryPoints().total].sort(),
    );
  });

  it('returns no teams when Conglomerates is off', () => {
    const [soloGame] = testGame(4);
    expect(ConglomeratesExpansion.getTeamModels(soloGame)).to.be.empty;
  });
});
