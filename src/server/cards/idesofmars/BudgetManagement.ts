import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

export class BudgetManagement extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BUDGET_MANAGEMENT,
      tags: [Tag.EARTH],
      cost: 3,

      resourceType: CardResource.BUDGET,
      victoryPoints: {resourcesHere: {}, per: 2},

      metadata: {
        cardNumber: 'I09',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 1 Budget resource to this card (2 if you have no cards in hand).', (eb) => {
            eb.empty().startAction.resource(CardResource.BUDGET);
          }).br;
          b.vpText('1 VP for every 2 Budget resources on this card.');
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.cardsInHand.length <= 3;
  }

  public action(player: IPlayer) {
    const qty = player.cardsInHand.length === 0 ? 2 : 1;
    player.addResourceTo(this, {qty, log: true});
    return undefined;
  }
}
