import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Bonus} from '../Bonus';
import {Policy, IPolicy} from '../Policy';
import {IGame} from '../../IGame';
import {IPlayer} from '../../IPlayer';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {POLITICAL_AGENDAS_MAX_ACTION_USES} from '../../../common/constants';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {TITLES} from '../../inputs/titles';
import {PreludesExpansion} from '../../preludes/PreludesExpansion';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {message} from '../../logs/MessageBuilder';
import {IMilestone} from '../../milestones/IMilestone';
import {IAward} from '../../awards/IAward';

/**
 * More Parties: Transhumanists, one of the 6 new "Political Agendas" parties. The source
 * material references "postlude" (a card type this codebase doesn't have) -- policy 3 is
 * replaced with a real Prelude-drawing action instead (this codebase's closest equivalent
 * concept, and mid-game prelude drawing has plenty of precedent, e.g. Board of Directors).
 * Policy 4's "draw 2 milestones or awards and replace an unclaimed one" is fully implementable:
 * although this game's 5 milestones/5 awards are fixed at setup, the wider pool of *candidate*
 * milestones/awards (everything compatible with this game's board/expansions, minus whatever
 * was actually chosen) is still computable, so a "swap in an unused one" action is real, not a
 * compromise -- see Game.getUnusedMilestoneCandidate/getUnusedAwardCandidate (that logic lives
 * on Game rather than being imported here directly, since MilestoneAwardSelector/Milestones/
 * Awards transitively import every card class, which would create a circular import with this
 * file -- turmoil parties load before cards are fully defined; Game.ts loads after). Bonus B
 * keeps only the "claimed milestone or award" half, dropping the postlude clause.
 */
export class Transhumanists extends Party implements IParty {
  readonly name = PartyName.TRANSHUMANISTS;
  readonly bonuses = [TRANSHUMANISTS_BONUS_1, TRANSHUMANISTS_BONUS_2];
  readonly policies = [TRANSHUMANISTS_POLICY_1, TRANSHUMANISTS_POLICY_2, TRANSHUMANISTS_POLICY_3, TRANSHUMANISTS_POLICY_4];
}

class TranshumanistsBonus01 extends Bonus {
  readonly id = 'trab01' as const;
  readonly description = 'Gain 1 M€ for every wild tag and every card with a tag requirement you have';

  getScore(player: IPlayer) {
    const wildTags = player.tags.count(Tag.WILD, 'raw');
    const tagRequirementCards = player.tableau.asArray().filter((card) => card.requirements.some((r) => r.tag !== undefined)).length;
    return wildTags + tagRequirementCards;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.TRANSHUMANISTS}});
  }
}

class TranshumanistsBonus02 extends Bonus {
  readonly id = 'trab02' as const;
  readonly description = 'Gain 2 M€ for every milestone or award you have claimed';

  getScore(player: IPlayer) {
    const game = player.game;
    const claimedMilestones = game.claimedMilestones.filter((m) => m.player === player).length;
    const fundedAwards = game.fundedAwards.filter((a) => a.player === player).length;
    return claimedMilestones + fundedAwards;
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player) * 2, {log: true, from: {partyName: PartyName.TRANSHUMANISTS}});
  }
}

class TranshumanistsPolicy01 extends Policy {
  readonly id = 'trap01' as const;
  readonly description = 'You\'re considered having 1 more wild tag';

  override onPolicyStartForPlayer(player: IPlayer): void {
    player.tags.extraWildTags += 1;
  }

  override onPolicyEndForPlayer(player: IPlayer): void {
    player.tags.extraWildTags -= 1;
  }
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.applyOnStandardProjectEffect.
class TranshumanistsPolicy02 implements IPolicy {
  readonly id = 'trap02' as const;
  readonly description = 'Every time you play a standard project, gain 2 M€';
}

// Compromise: original is "action, pay 5 M€ to buy a postlude," an EPIC campaign card type this
// codebase doesn't model. Replaced with drawing and playing a real Prelude card instead (this
// codebase's closest equivalent), at a higher cost (15 M€) to reflect that a Prelude is normally
// free -- same shape as the prelude2 card Board of Directors' action.
class TranshumanistsPolicy03 implements IPolicy {
  readonly id = 'trap03' as const;
  readonly description = 'Action: pay 15 M€ to draw and play a Prelude card (max 3 times per generation)';

  canAct(player: IPlayer): boolean {
    return player.canAfford(15) && player.politicalAgendasActionUsedCount < POLITICAL_AGENDAS_MAX_ACTION_USES &&
      player.game.preludeDeck.canDraw(1);
  }

  action(player: IPlayer) {
    const game = player.game;
    player.politicalAgendasActionUsedCount += 1;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.TRANSHUMANISTS));
    game.defer(new SelectPaymentDeferred(player, 15, {title: TITLES.payForPartyAction(PartyName.TRANSHUMANISTS)}))
      .andThen(() => {
        const prelude = game.preludeDeck.drawOrThrow(game);
        if (prelude.canPlay?.(player) === false) {
          PreludesExpansion.fizzle(player, prelude);
        } else {
          player.playCard(prelude, undefined, 'add');
        }
        return undefined;
      });
    return undefined;
  }
}

class TranshumanistsPolicy04 implements IPolicy {
  readonly id = 'trap04' as const;
  readonly description = 'Action: spend 10 M€ to draw 1 unused milestone and 1 unused award, swap one ' +
    'in for an unclaimed milestone or unfunded award, then optionally claim/fund it immediately (max 3 times per generation)';

  private hasUnclaimedMilestone(game: IGame): boolean {
    return !game.allMilestonesClaimed() && game.milestones.some((m) => !game.milestoneClaimed(m));
  }

  private hasUnfundedAward(game: IGame): boolean {
    return !game.allAwardsFunded() && game.awards.some((a) => !game.hasBeenFunded(a));
  }

  canAct(player: IPlayer): boolean {
    if (!player.canAfford(10) || player.politicalAgendasActionUsedCount >= POLITICAL_AGENDAS_MAX_ACTION_USES) {
      return false;
    }
    const game = player.game;
    const canSwapMilestone = this.hasUnclaimedMilestone(game) && game.getUnusedMilestoneCandidate() !== undefined;
    const canSwapAward = this.hasUnfundedAward(game) && game.getUnusedAwardCandidate() !== undefined;
    return canSwapMilestone || canSwapAward;
  }

  action(player: IPlayer) {
    const game = player.game;
    player.politicalAgendasActionUsedCount += 1;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.TRANSHUMANISTS));

    game.defer(new SelectPaymentDeferred(player, 10, {title: TITLES.payForPartyAction(PartyName.TRANSHUMANISTS)}))
      .andThen(() => {
        const offers: Array<SelectOption> = [];

        const newMilestone = this.hasUnclaimedMilestone(game) ? game.getUnusedMilestoneCandidate() : undefined;
        if (newMilestone !== undefined) {
          offers.push(new SelectOption(message('Bring in ${0} milestone', (b) => b.milestone(newMilestone)), 'Select')
            .andThen(() => this.swapMilestone(player, newMilestone)));
        }

        const newAward = this.hasUnfundedAward(game) ? game.getUnusedAwardCandidate() : undefined;
        if (newAward !== undefined) {
          offers.push(new SelectOption(message('Bring in ${0} award', (b) => b.award(newAward)), 'Select')
            .andThen(() => this.swapAward(player, newAward)));
        }

        if (offers.length === 0) {
          return undefined;
        }
        if (offers.length === 1) {
          return offers[0].cb(undefined);
        }
        player.defer(new OrOptions(...offers));
        return undefined;
      });

    return undefined;
  }

  private swapMilestone(player: IPlayer, newMilestone: IMilestone) {
    const game = player.game;
    const replaceable = game.milestones.filter((m) => !game.milestoneClaimed(m));

    const chooseReplacement = (previous: IMilestone) => {
      const index = game.milestones.indexOf(previous);
      game.milestones.splice(index, 1, newMilestone);
      game.log('${0} replaced the ${1} milestone with ${2}', (b) => b.player(player).milestone(previous).milestone(newMilestone));

      const claimOptions: Array<SelectOption> = [
        new SelectOption('Do not claim it now', 'Skip').andThen(() => undefined),
      ];
      if (newMilestone.canClaim(player)) {
        claimOptions.push(new SelectOption(message('Claim ${0} now', (b) => b.milestone(newMilestone)), 'Claim').andThen(() => {
          game.defer(new SelectPaymentDeferred(player, player.milestoneCost(), {title: 'Select how to pay for milestone'})).andThen(() => {
            game.log('${0} claimed ${1} milestone', (b) => b.player(player).milestone(newMilestone));
            game.claimedMilestones.push({player, milestone: newMilestone});
            return undefined;
          });
          return undefined;
        }));
      }
      player.defer(new OrOptions(...claimOptions));
      return undefined;
    };

    if (replaceable.length === 1) {
      return chooseReplacement(replaceable[0]);
    }
    player.defer(new OrOptions(...replaceable.map((m) =>
      new SelectOption(m.name, 'Replace').andThen(() => chooseReplacement(m)))));
    return undefined;
  }

  private swapAward(player: IPlayer, newAward: IAward) {
    const game = player.game;
    const replaceable = game.awards.filter((a) => !game.hasBeenFunded(a));

    const chooseReplacement = (previous: IAward) => {
      const index = game.awards.indexOf(previous);
      game.awards.splice(index, 1, newAward);
      game.log('${0} replaced the ${1} award with ${2}', (b) => b.player(player).award(previous).award(newAward));

      const fundOptions: Array<SelectOption> = [
        new SelectOption('Do not fund it now', 'Skip').andThen(() => undefined),
        new SelectOption(message('Fund ${0} now', (b) => b.award(newAward)), 'Fund').andThen(() => {
          game.defer(new SelectPaymentDeferred(player, player.awardFundingCost(), {title: 'Select how to pay for award'})).andThen(() => {
            game.fundAward(player, newAward);
            return undefined;
          });
          return undefined;
        }),
      ];
      player.defer(new OrOptions(...fundOptions));
      return undefined;
    };

    if (replaceable.length === 1) {
      return chooseReplacement(replaceable[0]);
    }
    player.defer(new OrOptions(...replaceable.map((a) =>
      new SelectOption(a.name, 'Replace').andThen(() => chooseReplacement(a)))));
    return undefined;
  }
}

export const TRANSHUMANISTS_BONUS_1 = new TranshumanistsBonus01();
export const TRANSHUMANISTS_BONUS_2 = new TranshumanistsBonus02();
export const TRANSHUMANISTS_POLICY_1 = new TranshumanistsPolicy01();
export const TRANSHUMANISTS_POLICY_2 = new TranshumanistsPolicy02();
export const TRANSHUMANISTS_POLICY_3 = new TranshumanistsPolicy03();
export const TRANSHUMANISTS_POLICY_4 = new TranshumanistsPolicy04();
