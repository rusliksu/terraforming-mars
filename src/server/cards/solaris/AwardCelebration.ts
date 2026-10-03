import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {IMilestone} from '../../milestones/IMilestone';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class AwardCelebration extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.AWARD_CELEBRATION,
      tags: [Tag.EARTH],
      cost: 9,

      requirements: {party: PartyName.CENTRISTS},

      metadata: {
        cardNumber: 'SL37',
        renderData: CardRenderer.builder((b) => {
          b.text(
            'choose an unclaimed milestone. If you meet its requirement, raise your TR 2 steps. Each ' +
            'opponent who also meets it raises their TR 1 step.',
            {size: Size.SMALL});
        }),
        description: 'Requires that Centrists are ruling or that you have 2 delegates there.',
      },
    });
  }

  private unclaimedMilestones(player: IPlayer): ReadonlyArray<IMilestone> {
    const game = player.game;
    return game.milestones.filter((milestone) => !game.milestoneClaimed(milestone));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.unclaimedMilestones(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const options = this.unclaimedMilestones(player).map((milestone) =>
      new SelectOption(milestone.name, 'Select').andThen(() => {
        if (milestone.canClaim(player)) {
          player.increaseTerraformRating(2, {log: true});
        }
        for (const opponent of player.opponents) {
          if (milestone.canClaim(opponent)) {
            opponent.increaseTerraformRating(1, {log: true});
          }
        }
        game.log('${0} celebrated the ${1} milestone', (b) => b.player(player).milestone(milestone));
        return undefined;
      }));

    return new OrOptions(...options);
  }
}
