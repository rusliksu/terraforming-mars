import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CardRenderer} from '../render/CardRenderer';
import {message} from '../../logs/MessageBuilder';
import {inplaceRemove} from '../../../common/utils/utils';
import {IMilestone} from '../../milestones/IMilestone';
import {IAward} from '../../awards/IAward';
import {milestoneManifest} from '../../milestones/Milestones';
import {awardManifest} from '../../awards/Awards';
import {milestoneNames} from '../../../common/ma/MilestoneName';
import {awardNames} from '../../../common/ma/AwardName';
import {RandomMAOptionType} from '../../../common/ma/RandomMAOptionType';
import {isCompatible} from '../../ma/MAManifest';

export class BattleOverMars extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.BATTLE_OVER_MARS,
      tags: [Tag.EARTH, Tag.SPACE],
      cost: 3,

      metadata: {
        cardNumber: 'H32',
        renderData: CardRenderer.builder((b) => {
          b.plainText(
            'Remove an unclaimed award or milestone from the game. If you play with random ' +
            'awards/milestones, put a new one of your choice.', true);
        }),
      },
    });
  }

  private removableMilestones(player: IPlayer): ReadonlyArray<IMilestone> {
    const game = player.game;
    return game.milestones.filter((milestone) => !game.milestoneClaimed(milestone));
  }

  private removableAwards(player: IPlayer): ReadonlyArray<IAward> {
    const game = player.game;
    return game.awards.filter((award) => !game.hasBeenFunded(award));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.removableMilestones(player).length > 0 || this.removableAwards(player).length > 0;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    const game = player.game;
    const options: Array<SelectOption> = [];

    for (const milestone of this.removableMilestones(player)) {
      options.push(
        new SelectOption(message('Remove ${0} milestone from the game', (b) => b.milestone(milestone))).andThen(() => {
          inplaceRemove(game.milestones, milestone);
          game.log('${0} removed the ${1} milestone from the game', (b) => b.player(player).milestone(milestone));
          if (game.gameOptions.randomMA !== RandomMAOptionType.NONE) {
            return this.selectReplacement(player, 'milestone');
          }
          return undefined;
        }),
      );
    }

    for (const award of this.removableAwards(player)) {
      options.push(
        new SelectOption(message('Remove ${0} award from the game', (b) => b.award(award))).andThen(() => {
          inplaceRemove(game.awards, award);
          game.log('${0} removed the ${1} award from the game', (b) => b.player(player).award(award));
          if (game.gameOptions.randomMA !== RandomMAOptionType.NONE) {
            return this.selectReplacement(player, 'award');
          }
          return undefined;
        }),
      );
    }

    return new OrOptions(...options);
  }

  // Only offered when gameOptions.randomMA isn't NONE -- see MilestoneAwardSelector.ts,
  // which is the only place the "fixed board set" vs "randomized" distinction is made.
  private selectReplacement(player: IPlayer, kind: 'milestone' | 'award'): PlayerInput | undefined {
    const game = player.game;
    if (kind === 'milestone') {
      const existing = new Set(game.milestones.map((m) => m.name));
      const candidates = milestoneNames.filter((name) => !existing.has(name) && isCompatible(name, milestoneManifest, game.gameOptions));
      if (candidates.length === 0) {
        return undefined;
      }
      return new OrOptions(...candidates.map((name) => {
        const milestone = milestoneManifest.createOrThrow(name);
        return new SelectOption(message('Add ${0} milestone to the game', (b) => b.milestone(milestone))).andThen(() => {
          game.milestones.push(milestone);
          game.log('${0} added the ${1} milestone to the game', (b) => b.player(player).milestone(milestone));
          return undefined;
        });
      }));
    }

    const existing = new Set(game.awards.map((a) => a.name));
    const candidates = awardNames.filter((name) => !existing.has(name) && isCompatible(name, awardManifest, game.gameOptions));
    if (candidates.length === 0) {
      return undefined;
    }
    return new OrOptions(...candidates.map((name) => {
      const award = awardManifest.createOrThrow(name);
      return new SelectOption(message('Add ${0} award to the game', (b) => b.award(award))).andThen(() => {
        game.awards.push(award);
        game.log('${0} added the ${1} award to the game', (b) => b.player(player).award(award));
        return undefined;
      });
    }));
  }
}
