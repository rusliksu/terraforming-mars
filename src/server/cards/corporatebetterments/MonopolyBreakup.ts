import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {IMilestone} from '../../milestones/IMilestone';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

/** How far ahead in TR another player must be for this card to be playable. */
const REQUIRED_TR_LEAD = 10;

export class MonopolyBreakup extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.MONOPOLY_BREAKUP,
      tags: [],
      cost: 5,

      metadata: {
        cardNumber: 'CB30',
        renderData: CardRenderer.builder((b) => {
          b.text(
            'Claim an available milestone, even if the limit has been surpassed.',
            {size: Size.SMALL, uppercase: true});
        }),
        description: `Requires that another player's TR is ${REQUIRED_TR_LEAD} or more steps ahead of yours.`,
      },
    });
  }

  private hasQualifyingLeader(player: IPlayer): boolean {
    return player.game.players.some((p) => p !== player && p.terraformRating - player.terraformRating >= REQUIRED_TR_LEAD);
  }

  private claimableMilestones(player: IPlayer): ReadonlyArray<IMilestone> {
    const game = player.game;
    return game.milestones.filter((milestone) => !game.milestoneClaimed(milestone) && milestone.canClaim(player));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.hasQualifyingLeader(player) && this.claimableMilestones(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const options = this.claimableMilestones(player).map((milestone) =>
      new SelectOption(milestone.name, 'Claim').andThen(() => {
        game.defer(new SelectPaymentDeferred(player, player.milestoneCost(), {title: 'Select how to pay for milestone'}))
          .andThen(() => {
            game.log('${0} claimed ${1} milestone', (b) => b.player(player).milestone(milestone));
            game.claimedMilestones.push({player, milestone});
            return undefined;
          });
        return undefined;
      }));

    return new OrOptions(...options);
  }
}
