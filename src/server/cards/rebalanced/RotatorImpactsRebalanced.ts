import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {CardResource} from '@/common/CardResource';
import {MAX_VENUS_SCALE} from '@/common/constants';
import {IPlayer} from '@/server/IPlayer';
import {TitledBehavior} from '@/server/behavior/Behavior';
import {getBehaviorExecutor} from '@/server/behavior/BehaviorExecutor';
import {Card} from '@/server/cards/Card';
import {IActionCard} from '@/server/cards/ICard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {max} from '@/server/cards/Options';

export class RotatorImpactsRebalanced extends Card implements IActionCard {
  private static readonly BUY_ASTEROID: TitledBehavior = {
    title: 'Pay 6 M€ to add 1 asteroid to any card',
    spend: {megacredits: 6, canUseTitanium: true},
    addResourcesToAnyCard: {count: 1, type: CardResource.ASTEROID, autoSelect: true},
  };

  private static readonly RAISE_VENUS: TitledBehavior = {
    title: 'Remove 1 asteroid here to raise Venus 1 step',
    spend: {resourcesHere: 1},
    global: {venus: 1},
  };

  constructor() {
    super({
      name: CardName.ROTATOR_IMPACTS_REBALANCED,
      type: CardType.ACTIVE,
      tags: [Tag.SPACE],
      cost: 6,
      resourceType: CardResource.ASTEROID,
      requirements: {venus: 14, max},
      metadata: {
        cardNumber: '243',
        description: 'Venus must be 14% or lower',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 6 M€ to add an asteroid resource to ANY card [TITANIUM MAY BE USED].', (eb) => {
            eb.megacredits(6).super((b) => b.titanium(1)).startAction.resource(CardResource.ASTEROID).asterix();
          }).br;
          b.action('Spend 1 resource from this card to increase Venus 1 step.', (eb) => {
            eb.or().resource(CardResource.ASTEROID).startAction.venus(1);
          });
        }),
      },
    });
  }

  private availableActions(player: IPlayer): Array<TitledBehavior> {
    const executor = getBehaviorExecutor();
    const actions: Array<TitledBehavior> = [];
    if (player.game.getVenusScaleLevel() < MAX_VENUS_SCALE && executor.canExecute(RotatorImpactsRebalanced.RAISE_VENUS, player, this)) {
      actions.push(RotatorImpactsRebalanced.RAISE_VENUS);
    }
    if (executor.canExecute(RotatorImpactsRebalanced.BUY_ASTEROID, player, this)) {
      actions.push(RotatorImpactsRebalanced.BUY_ASTEROID);
    }
    return actions;
  }

  public canAct(player: IPlayer): boolean {
    return this.availableActions(player).length > 0;
  }

  public action(player: IPlayer) {
    const behaviors = this.availableActions(player);
    if (behaviors.length > 0) {
      getBehaviorExecutor().execute({or: {autoSelect: true, behaviors}}, player, this, {logSource: false});
    }
    return undefined;
  }
}
