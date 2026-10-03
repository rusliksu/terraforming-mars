import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Reactive listener, not a repeatable action -- implemented via the existing (previously
 * unused) ICard.onStandardProject hook that StandardProjectCard.projectPlayed already calls
 * for every played standard project, including Sell Patents. Sell Patents is excluded here to
 * match the printed reminder text ("Selling patents, trade and adding delegates aren't standard
 * projects."); trade and adding delegates never call onStandardProject at all, so they need no
 * special handling.
 */
export class AppliedResearch extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.APPLIED_RESEARCH,
      tags: [Tag.SCIENCE, Tag.SCIENCE],
      cost: 9,

      requirements: {tag: Tag.SCIENCE, count: 2},

      metadata: {
        cardNumber: 'IM127',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a Standard Project (other than Sell Patents), draw a card.', (eb) => {
            eb.text('SP').startEffect.cards(1);
          });
        }),
        description: 'Requires 2 Science tags.',
      },
    });
  }

  public onStandardProject(player: IPlayer, project: IStandardProjectCard): void {
    if (project.name === CardName.SELL_PATENTS_STANDARD_PROJECT) {
      return;
    }
    player.drawCard();
    player.game.log('${0} drew a card from ${1}', (b) => b.player(player).card(this));
  }
}
