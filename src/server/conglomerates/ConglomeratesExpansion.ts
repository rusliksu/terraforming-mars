import {IPlayer} from '../IPlayer';
import {IGame} from '../IGame';
import {PlayerId} from '../../common/Types';
import {ConglomeratesData, ConglomeratesTeam} from './ConglomeratesData';
import {ConglomeratesPlayerData, TeamActionCosts} from '../../common/conglomerates/ConglomeratesPlayerData';
import {AwardScorer} from '../awards/AwardScorer';
import {sum} from '../../common/utils/utils';
import {TeamVictoryPointsBreakdown} from '../../common/conglomerates/TeamVictoryPointsBreakdown';
import {ConglomeratesTeamModel, ConglomeratesTeamScore} from '../../common/models/ConglomeratesModel';
import {IParty} from '../turmoil/parties/IParty';
import {Color, PLAYER_COLORS} from '../../common/Color';
import {CardName} from '../../common/cards/CardName';
import {CITY_TILES} from '../../common/TileType';

const MILESTONE_TEAM_VP = 8;
const AWARD_TEAM_VP = 8;

export const TEAM_ACTION_BASE_COSTS: TeamActionCosts = {
  givePatent: 2,
  facilitySharing: 1,
  donation: 1,
};

export class ConglomeratesExpansion {
  private constructor() {}

  public static initializeEmpty(): ConglomeratesData {
    return {teams: []};
  }

  /**
   * Pairs players into teams. `teamAssignments`, when given, is one team-index per player
   * (same order as `players`), chosen by the user on the Create Game screen -- players
   * sharing an index become a team. When absent (or the wrong length, e.g. an older saved
   * settings JSON or a non-UI API caller), falls back to pairing by table order: with 4
   * players, seats 0&2 form one team and seats 1&3 form the other. An odd player out (or a
   * team-index used by only one player) is left teamless.
   */
  public static initialize(players: ReadonlyArray<IPlayer>, teamAssignments?: ReadonlyArray<number>): ConglomeratesData {
    if (teamAssignments !== undefined && teamAssignments.length === players.length) {
      const groups = new Map<number, Array<PlayerId>>();
      players.forEach((player, idx) => {
        const team = teamAssignments[idx];
        const group = groups.get(team) ?? [];
        group.push(player.id);
        groups.set(team, group);
      });
      // Sort by the team-assignment number itself, not Map insertion order (which reflects
      // whichever team happens to appear first in `players`) -- otherwise the resulting
      // `teams[0]`/`teams[1]` can end up swapped relative to what the Create Game form calls
      // "Team 1"/"Team 2" whenever `players` isn't in its original, unrotated order (e.g.
      // Random First Player now rotates the player array -- see CreateGameForm.vue), silently
      // swapping which team gets teamDisplayColor's fixed orange/purple.
      const teams: Array<ConglomeratesTeam> = [...groups.entries()]
        .sort(([teamA], [teamB]) => teamA - teamB)
        .map(([, playerIds]) => ({
          playerIds,
          bonusVictoryPoints: 0,
        }));
      return {teams};
    }

    const teams: Array<ConglomeratesTeam> = [];
    const half = Math.floor(players.length / 2);
    for (let i = 0; i < half; i++) {
      teams.push({
        playerIds: [players[i].id, players[i + half].id],
        bonusVictoryPoints: 0,
      });
    }
    return {teams};
  }

  public static initializePlayer(): ConglomeratesPlayerData {
    return {coordination: 0, teamActionCosts: {...TEAM_ACTION_BASE_COSTS}};
  }

  public static getTeam(player: IPlayer): ConglomeratesTeam | undefined {
    // player.game is unset for some bare, gameless test players -- treat that as teamless.
    return player.game?.conglomerates?.teams.find((team) => team.playerIds.includes(player.id));
  }

  public static teammates(player: IPlayer): ReadonlyArray<IPlayer> {
    const team = this.getTeam(player);
    if (team === undefined) {
      return [];
    }
    return team.playerIds
      .filter((id) => id !== player.id)
      .map((id) => player.game.getPlayerById(id));
  }

  /**
   * True when `spacePlayer` (the owner of a board space, or undefined for an unowned one) is
   * `player` or one of their teammates. Used to extend "adjacent to your own tile"
   * placement-legality checks (base-game greenery, Mining Area, Arcadian Communities, Kingdom
   * of Tauraro) to a teammate's tiles -- never for adjacency-triggered bonus payouts, which
   * only ever count the acting player's own tiles.
   */
  public static isTeammateOrSelf(player: IPlayer, spacePlayer: IPlayer | undefined): boolean {
    if (spacePlayer === undefined) {
      return false;
    }
    if (spacePlayer.id === player.id) {
      return true;
    }
    return this.teammates(player).some((teammate) => teammate.id === spacePlayer.id);
  }

  public static gainCoordination(player: IPlayer, count: number, options?: {log: boolean}) {
    player.conglomeratesData.coordination += count;
    if (options?.log === true) {
      player.game.log('${0} gained ${1} coordination', (b) => b.player(player).number(count));
    }
  }

  public static spendCoordination(player: IPlayer, count: number, options?: {log: boolean}) {
    player.conglomeratesData.coordination -= count;
    if (options?.log === true) {
      player.game.log('${0} spent ${1} coordination', (b) => b.player(player).number(count));
    }
  }

  public static getTeamActionCost(player: IPlayer, action: keyof TeamActionCosts): number {
    return player.conglomeratesData.teamActionCosts[action];
  }

  /** Raises `action`'s cost by 1 for `player` only -- not their teammate -- for the rest of the generation. */
  public static increaseTeamActionCost(player: IPlayer, action: keyof TeamActionCosts) {
    player.conglomeratesData.teamActionCosts[action] += 1;
  }

  /**
   * Resets `player`'s own Team Action costs back to base at the start of a new generation's
   * production phase, from `Player.finishProductionPhase()`.
   */
  public static resetTeamActionCosts(player: IPlayer) {
    player.conglomeratesData.teamActionCosts = {...TEAM_ACTION_BASE_COSTS};
  }

  /** `player`'s team, as player ids including `player`. A teamless player is their own team of one. */
  public static teamPlayerIds(player: IPlayer): ReadonlyArray<PlayerId> {
    return this.getTeam(player)?.playerIds ?? [player.id];
  }

  /**
   * Groups every player in the game into a team (playerIds), pairing teamless players
   * into solo teams of one so award ranking still works for them.
   */
  private static allTeamGroups(game: IGame): Array<ReadonlyArray<PlayerId>> {
    const grouped = new Set<PlayerId>();
    const groups: Array<ReadonlyArray<PlayerId>> = [];
    for (const player of game.players) {
      if (grouped.has(player.id)) {
        continue;
      }
      const ids = this.teamPlayerIds(player);
      ids.forEach((id) => grouped.add(id));
      groups.push(ids);
    }
    return groups;
  }

  /**
   * A milestone/award threshold check, scaled 1.5x (rounded up) and evaluated against the
   * combined score of `player`'s whole team, when Conglomerates is on and `player` has a
   * teammate. Otherwise, behaves like the unscaled single-player check.
   */
  public static meetsTeamThreshold(player: IPlayer, threshold: number, getScore: (player: IPlayer) => number): boolean {
    // A team can only exist inside a real game, so checking teammates first (which tolerates a
    // gameless player) avoids dereferencing player.game before we know it's actually set.
    const teammates = player.teammates();
    if (teammates.length === 0 || !player.game.gameOptions.conglomeratesExpansion) {
      return getScore(player) >= threshold;
    }
    const combined = getScore(player) + sum(teammates.map(getScore));
    return combined >= Math.ceil(threshold * 1.5);
  }

  /**
   * Milestones/awards are team-only VP in a Conglomerates game -- never folded into an
   * individual player's own getVictoryPoints() (see calculateVictoryPoints.ts, which skips
   * its base-game per-player milestone/award VP entirely when Conglomerates is on). Each
   * claimed milestone pays MILESTONE_TEAM_VP to the claimer's whole team, and each funded
   * award pays AWARD_TEAM_VP win-take-all to whichever team has the highest combined score
   * (ties all win). The Coordination reward for claiming/funding is granted separately, at
   * the point of claiming/funding -- this only covers the VP side of the reward.
   */
  private static teamMilestoneAndAwardVP(game: IGame, team: ConglomeratesTeam): {milestones: number, awards: number} {
    let milestones = 0;
    for (const claimed of game.claimedMilestones) {
      if (claimed.player !== undefined && team.playerIds.includes(claimed.player.id)) {
        milestones += MILESTONE_TEAM_VP;
      }
    }

    let awards = 0;
    for (const fundedAward of game.fundedAwards) {
      const scorer = new AwardScorer(game, fundedAward.award);
      const teamScores = this.allTeamGroups(game).map((playerIds) => ({
        playerIds,
        score: sum(playerIds.map((id) => scorer.get(game.getPlayerById(id)))),
      }));
      const topScore = Math.max(...teamScores.map((t) => t.score));
      const wonByThisTeam = teamScores.some((t) => t.score === topScore && t.playerIds.some((id) => team.playerIds.includes(id)));
      if (wonByThisTeam) {
        awards += AWARD_TEAM_VP;
      }
    }

    return {milestones, awards};
  }

  /**
   * The live team scoreboard, and the *only* place milestone/award VP is ever added up for a
   * Conglomerates game: each member's own personal VP (their real total -- milestones/awards
   * are never part of it, see calculateVictoryPoints.ts), plus the team's milestone and award
   * VP, plus `bonuses` -- VP not attributed to an individual player, such as winning a
   * Turmoil ruling (see `rewardRulingTeam`).
   */
  public static calculateTeamVictoryPoints(game: IGame, team: ConglomeratesTeam): TeamVictoryPointsBreakdown {
    const players = sum(team.playerIds.map((id) => game.getPlayerById(id).getVictoryPoints().total));
    const {milestones, awards} = game.isSoloMode() ? {milestones: 0, awards: 0} : this.teamMilestoneAndAwardVP(game, team);
    const bonuses = team.bonusVictoryPoints ?? 0;
    return {
      players,
      milestones,
      awards,
      bonuses,
      total: players + milestones + awards + bonuses,
    };
  }

  /**
   * Called when `party` becomes the new ruling party (Turmoil.setRulingParty, before its
   * delegates are returned to reserve). Groups the party's delegates by team; if exactly one
   * team holds a strict plurality (more than any other single team, ties excluded), that team
   * "won the ruling": both members gain 1 Coordination, and the team gains 1 VP (`bonuses`).
   */
  public static rewardRulingTeam(game: IGame, party: IParty) {
    const teamDelegateCounts = new Map<ConglomeratesTeam, number>();
    party.delegates.forEachMultiplicity((count, delegate) => {
      if (delegate === 'NEUTRAL') {
        return;
      }
      const team = this.getTeam(delegate);
      if (team === undefined) {
        return;
      }
      teamDelegateCounts.set(team, (teamDelegateCounts.get(team) ?? 0) + count);
    });
    if (teamDelegateCounts.size === 0) {
      return;
    }

    const sorted = [...teamDelegateCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topCount = sorted[0][1];
    if (sorted.length > 1 && sorted[1][1] === topCount) {
      // Tied for the lead -- no team clearly won the ruling.
      return;
    }
    const [winningTeam] = sorted[0];

    winningTeam.bonusVictoryPoints = (winningTeam.bonusVictoryPoints ?? 0) + 1;
    game.log('A team won the ${0} ruling, gaining 1 Coordination each and 1 team VP', (b) => b.partyName(party.name));
    for (const playerId of winningTeam.playerIds) {
      this.gainCoordination(game.getPlayerById(playerId), 1, {log: true});
    }
  }

  /**
   * The shared delegate color for `player`'s team in Turmoil (and everywhere else a team's
   * color is shown, e.g. the resource bar outline, the team score panel): team 1 is always
   * orange, team 2 is always purple -- fixed, not derived from what colors the players
   * themselves picked, so the same two colors mean "team" consistently across every game.
   * Paired with the Create Game form always assigning team 1 red+yellow and team 2 green+blue
   * (CreateGameForm.vue's `forceConglomeratesColors`), orange/purple never collide with an
   * individual player's own color in the standard 2v2 case. For a 3rd+ team (not otherwise
   * supported yet), falls back to the old dynamic pick -- an unused `PLAYER_COLORS` entry,
   * excluding orange/purple so it can't collide with either fixed team either.
   * Undefined if `player` is teamless, or if every fallback color is already taken.
   */
  public static teamDisplayColor(player: IPlayer): Color | undefined {
    const game = player.game;
    const teams = game?.conglomerates?.teams;
    if (teams === undefined) {
      return undefined;
    }
    const index = teams.findIndex((team) => team.playerIds.includes(player.id));
    if (index === -1) {
      return undefined;
    }
    const fixedTeamColors: Array<Color> = ['orange', 'purple'];
    if (index < fixedTeamColors.length) {
      return fixedTeamColors[index];
    }
    const usedColors = new Set([...game.players.map((p) => p.color), ...fixedTeamColors]);
    const availableColors = PLAYER_COLORS.filter((color) => !usedColors.has(color));
    return availableColors[index - fixedTeamColors.length];
  }

  /**
   * How much of `player`'s still-uncovered negative VP (after their own Underworld corruption
   * bribe, `ownBribe`) a teammate's leftover corruption can offset. A teammate only has
   * leftover corruption once their own negative VP is fully covered by their own corruption
   * (see `calculateNegativeVP`), so a player who themselves needs help can never simultaneously
   * have leftover to give -- this can't double-count or go in circles.
   */
  public static teammateCorruptionAssist(player: IPlayer, negativeVP: number, ownBribe: number): number {
    let remaining = Math.abs(negativeVP) - ownBribe;
    if (remaining <= 0) {
      return 0;
    }
    let assist = 0;
    for (const teammate of player.teammates()) {
      const teammateNegativeVP = this.negativeVPForCorruptionSharing(teammate);
      const teammateOwnBribe = Math.min(Math.abs(teammateNegativeVP), teammate.underworldData.corruption);
      const leftover = teammate.underworldData.corruption - teammateOwnBribe;
      const contribution = Math.min(remaining, leftover);
      assist += contribution;
      remaining -= contribution;
      if (remaining <= 0) {
        break;
      }
    }
    return assist;
  }

  /**
   * A copy of `calculateVictoryPoints.ts`'s private `calculateNegativeVP` (cards' negative VP
   * plus the Vermin penalty). Not imported from there: that file already imports this one (for
   * `calculateVictoryPoints` above), and importing back would create a two-file cycle that
   * crashes at module load ("cannot access before initialization") rather than just at
   * typecheck time -- so this small, stable calculation is duplicated instead.
   *
   * Same reasoning for counting Venus Phase 2's Cloud City tiles inline below instead of calling
   * VenusPhase2Expansion.getCitiesCount: that helper (like this whole file, transitively, via
   * TurmoilModel -> SelectParty -> SendDelegateToArea -> AresHandler -> Board) sits on the far
   * side of a cycle through boards/Board.ts, which crashes the same way if crossed.
   */
  private static negativeVPForCorruptionSharing(player: IPlayer): number {
    let negativeVP = 0;
    let playerOwnsVermin = false;
    for (const playedCard of player.tableau) {
      if (playedCard.victoryPoints !== undefined) {
        const vp = playedCard.getVictoryPoints(player);
        if (vp < 0) {
          negativeVP += vp;
        }
      }
      playerOwnsVermin ||= playedCard.name === CardName.VERMIN;
    }
    if (player.game.verminInEffect && playerOwnsVermin === false) {
      const venusCities = player.game.venusPhase2Data?.venusSurface.spaces.filter((space) =>
        space.tile !== undefined && CITY_TILES.has(space.tile.tileType) && space.player?.id === player.id).length ?? 0;
      negativeVP -= player.game.board.getCities(player).length + venusCities;
    }
    return negativeVP;
  }

  public static getTeamModels(game: IGame): Array<ConglomeratesTeamModel> {
    if (!game.gameOptions.conglomeratesExpansion) {
      return [];
    }
    return game.conglomerates.teams.map((team, index) => {
      const members = team.playerIds.map((id) => game.getPlayerById(id));
      return {
        id: `team-${index + 1}`,
        playerIds: [...team.playerIds],
        playerColors: members.map((member) => member.color),
        teamColor: this.teamDisplayColor(members[0]),
        memberScores: members.map((member) => member.getVictoryPoints().total),
        name: members.map((member) => member.name).join(' & '),
        victoryPoints: this.calculateTeamVictoryPoints(game, team),
      };
    });
  }

  /**
   * Each team's combined score for one milestone/award, shown alongside the per-player scores
   * in Milestone.vue/Award.vue. For an ordinary per-player `getScore`, this sums across
   * teammates -- the same combination `BaseMilestone.canClaim` (via `meetsTeamThreshold`)
   * already compares against internally, just exposed here as a real number for display.
   * `alreadyTeamScoped` is for the rare milestone (currently only `Generalist2`) whose own
   * `getScore` already returns an identical team-wide value for every member -- summing those
   * would double-count, so this takes just one member's value instead.
   */
  public static getTeamScores(game: IGame, getScore: (player: IPlayer) => number, alreadyTeamScoped: boolean = false): Array<ConglomeratesTeamScore> {
    if (!game.gameOptions.conglomeratesExpansion) {
      return [];
    }
    return game.conglomerates.teams.map((team) => {
      const members = team.playerIds.map((id) => game.getPlayerById(id));
      const score = alreadyTeamScoped ? getScore(members[0]) : sum(members.map(getScore));
      return {playerColors: members.map((member) => member.color), teamColor: this.teamDisplayColor(members[0]), score};
    });
  }
}
