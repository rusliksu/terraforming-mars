import {Phase} from '../../common/Phase';
import {IPlayer} from '../IPlayer';
import {Board} from '../boards/Board';
import {MoonExpansion} from '../moon/MoonExpansion';
import {VenusPhase2Expansion} from '../venusPhase2/VenusPhase2Expansion';
import {PathfindersExpansion} from '../pathfinders/PathfindersExpansion';
import {DeltaProjectExpansion} from '../delta/DeltaProjectExpansion';
import {Turmoil} from '../turmoil/Turmoil';
import {VictoryPointsBreakdownBuilder} from './VictoryPointsBreakdownBuilder';
import {FundedAward} from '../awards/FundedAward';
import {AwardScorer} from '../awards/AwardScorer';
import {CardName} from '../../common/cards/CardName';
import {ConglomeratesExpansion} from '../conglomerates/ConglomeratesExpansion';

export function calculateVictoryPoints(player: IPlayer) {
  const builder = new VictoryPointsBreakdownBuilder();

  // Victory points from cards
  // idesOfMars' Public Relations: this player's own negative-VP cards no longer count against
  // them (doesn't affect the Vermin penalty below, which isn't "a card you own").
  const ignoreOwnNegativeVP = player.tableau.some((c) => c.name === CardName.PUBLIC_RELATIONS);
  let playerOwnsVermin = false; // For Vermin
  for (const playedCard of player.tableau) {
    if (playedCard.victoryPoints !== undefined) {
      const vp = playedCard.getVictoryPoints(player);
      builder.setVictoryPoints('victoryPoints', ignoreOwnNegativeVP && vp < 0 ? 0 : vp, playedCard.name);
    }
    playerOwnsVermin ||= playedCard.name === CardName.VERMIN;
  }

  // Apply the Vermin penalty to other players. Vermin owner is penalized by the card itself.
  if (player.game.verminInEffect && playerOwnsVermin === false) {
    const cities = player.game.board.getCities(player).length + VenusPhase2Expansion.getCitiesCount(player.game, player);
    builder.setVictoryPoints('victoryPoints', cities * -1, CardName.VERMIN);
  }

  const negativeVP = calculateNegativeVP(player); // For Underworld.

  // Victory points from TR
  builder.setVictoryPoints('terraformRating', player.terraformRating);

  // Victory points from awards and milestones -- in a Conglomerates game these are team-only
  // VP, never folded into an individual player's own total (see
  // ConglomeratesExpansion.calculateTeamVictoryPoints, the sole place they're added up).
  if (!player.game.gameOptions.conglomeratesExpansion) {
    giveAwards(player, builder);
    for (const milestone of player.game.claimedMilestones) {
      if (milestone.player !== undefined && milestone.player.id === player.id) {
        builder.setVictoryPoints('milestones', 5, 'Claimed ${0} milestone', [milestone.milestone.name]);
      }
    }
  }

  // Victory points from board
  player.game.board.spaces.forEach((space) => {
    // Victory points for greenery tiles
    if (Board.isGreenerySpace(space) && Board.spaceOwnedBy(space, player)) {
      builder.setVictoryPoints('greenery', 1);
    }

    // Victory points for greenery tiles adjacent to cities
    if (Board.isCitySpace(space) && Board.spaceOwnedBy(space, player)) {
      const adjacent = player.game.board.getAdjacentSpaces(space);
      for (const adj of adjacent) {
        if (Board.isGreenerySpace(adj)) {
          builder.setVictoryPoints('city', 1);
        }
      }
    }
  });

  // Turmoil Victory Points
  const includeTurmoilVP = player.game.gameIsOver() || player.game.phase === Phase.END;

  Turmoil.ifTurmoil(player.game, (turmoil) => {
    if (includeTurmoilVP) {
      builder.setVictoryPoints('victoryPoints', turmoil.getVictoryPoints(player), 'Turmoil Points');
    }
  });

  const coloniesVP = player.colonies.getVictoryPoints();
  if (coloniesVP > 0) {
    builder.setVictoryPoints('victoryPoints', coloniesVP, 'Colony VP');
  }
  MoonExpansion.calculateVictoryPoints(player, builder);
  VenusPhase2Expansion.calculateVictoryPoints(player, builder);
  PathfindersExpansion.calculateVictoryPoints(player, builder);
  DeltaProjectExpansion.calculateVictoryPoints(player, builder);

  // Underworld Score Bribing
  if (player.game.gameOptions.underworldExpansion === true) {
    const bribe = Math.min(Math.abs(negativeVP), player.underworldData.corruption);
    builder.setVictoryPoints('victoryPoints', bribe, 'Underworld Corruption Bribe');

    if (player.game.gameOptions.conglomeratesExpansion) {
      const assist = ConglomeratesExpansion.teammateCorruptionAssist(player, negativeVP, bribe);
      if (assist > 0) {
        builder.setVictoryPoints('victoryPoints', assist, 'Teammate Corruption Bribe');
      }
    }
  }

  // Escape velocity VP penalty
  if (player.game.gameOptions.escapeVelocity !== null && player.game.gameOptions.escapeVelocity !== undefined) {
    const options = player.game.gameOptions.escapeVelocity;

    const elapsedTimeMinutes = player.timer.getElapsedTimeInMinutes();
    const bonusActionMinutes = player.actionsTakenThisGame * (options.bonusSectionsPerAction / 60);
    const overageMin = elapsedTimeMinutes - bonusActionMinutes - options.thresholdMinutes;

    if (overageMin > 0) {
      const vpPenalty = options.penaltyVPPerPeriod * Math.floor(overageMin / options.penaltyPeriodMinutes);
      builder.setVictoryPoints('escapeVelocity', -vpPenalty);
    }
  }

  return builder.build();
}

/**
 * A player's negative VP from cards and the Vermin penalty -- the same total the Underworld
 * corruption bribe above offsets.
 *
 * Not exported: `ConglomeratesExpansion` needs the equivalent for a teammate (to see how much
 * of their corruption is "leftover" after covering their own negative VP), but importing this
 * function here would put an edge from ConglomeratesExpansion back to this file, on top of the
 * existing edge the other way (this file imports `ConglomeratesExpansion` above, for
 * `teammateCorruptionAssist`) -- that cycle triggers a real "cannot access before
 * initialization" crash at module load, so `ConglomeratesExpansion.ts` keeps its own small
 * copy of this instead of importing it.
 */
function calculateNegativeVP(player: IPlayer): number {
  // idesOfMars' Public Relations: mirrors the same card-level exclusion applied above, so a
  // player who no longer suffers their own negative-VP cards also doesn't get an Underworld
  // corruption bribe for VP they were never docked in the first place.
  const ignoreOwnNegativeVP = player.tableau.some((c) => c.name === CardName.PUBLIC_RELATIONS);
  let negativeVP = 0;
  let playerOwnsVermin = false;
  for (const playedCard of player.tableau) {
    if (playedCard.victoryPoints !== undefined && !ignoreOwnNegativeVP) {
      const vp = playedCard.getVictoryPoints(player);
      if (vp < 0) {
        negativeVP += vp;
      }
    }
    playerOwnsVermin ||= playedCard.name === CardName.VERMIN;
  }
  if (player.game.verminInEffect && playerOwnsVermin === false) {
    negativeVP -= player.game.board.getCities(player).length + VenusPhase2Expansion.getCitiesCount(player.game, player);
  }
  return negativeVP;
}

function maybeSetVP(thisPlayer: IPlayer, awardWinner: IPlayer, fundedAward: FundedAward, vps: number, place: '1st' | '2nd', builder: VictoryPointsBreakdownBuilder) {
  if (thisPlayer.id === awardWinner.id) {
    builder.setVictoryPoints(
      'awards',
      vps,
      '${0} place for ${1} award (funded by ${2})',
      [place, fundedAward.award.name, fundedAward.player.name],
    );
  }
}

function giveAwards(player: IPlayer, builder: VictoryPointsBreakdownBuilder) {
  // Awards are disabled for 1 player games
  if (player.game.isSoloMode()) {
    return;
  }

  player.game.fundedAwards.forEach((fundedAward) => {
    const award = fundedAward.award;
    const scorer = new AwardScorer(player.game, award);
    const players: Array<IPlayer> = player.game.players.slice();
    players.sort((p1, p2) => scorer.get(p2) - scorer.get(p1));

    // There is one rank 1 player
    if (scorer.get(players[0]) > scorer.get(players[1])) {
      maybeSetVP(player, players[0], fundedAward, 5, '1st', builder);
      players.shift();

      if (players.length > 1) {
        // There is one rank 2 player
        if (scorer.get(players[0]) > scorer.get(players[1])) {
          maybeSetVP(player, players[0], fundedAward, 2, '2nd', builder);
        } else {
          // There are at least two rank 2 players
          const score = scorer.get(players[0]);
          while (players.length > 0 && scorer.get(players[0]) === score) {
            maybeSetVP(player, players[0], fundedAward, 2, '2nd', builder);
            players.shift();
          }
        }
      }
    } else {
      // There are at least two rank 1 players
      const score = scorer.get(players[0]);
      while (players.length > 0 && scorer.get(players[0]) === score) {
        maybeSetVP(player, players[0], fundedAward, 5, '1st', builder);
        players.shift();
      }
    }
  });
}
