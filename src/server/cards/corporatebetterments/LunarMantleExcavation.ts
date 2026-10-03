import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {SelectAmount} from '../../inputs/SelectAmount';
import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class LunarMantleExcavation extends Card implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.LUNAR_MANTLE_EXCAVATION,
      tags: [Tag.POWER, Tag.MOON, Tag.BUILDING],
      cost: 15,

      behavior: {
        production: {energy: 1},
      },

      requirements: {tag: Tag.MOON},
      victoryPoints: 1,

      metadata: {
        cardNumber: 'CB24',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend any amount of energy and gain that amount of steel.', (eb) => {
            eb.text('x').energy(1).startAction.text('x').steel(1);
          });
        }),
        description: 'Requires 1 Moon tag. Increase your energy production 1 step.',
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.availableEnergy() > 0;
  }

  public action(player: IPlayer) {
    return new SelectAmount('Select amount of energy to spend', 'Spend energy', 1, player.availableEnergy())
      .andThen((amount) => {
        return player.spendEnergy(amount, () => {
          player.stock.add(Resource.STEEL, amount, {log: true});
          return undefined;
        });
      });
  }
}
