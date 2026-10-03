import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectAmount} from '../../inputs/SelectAmount';
import {message} from '../../logs/MessageBuilder';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class PlantEater extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PLANT_EATER,
      tags: [Tag.PLANT],
      cost: 10,
      victoryPoints: 1,

      requirements: {production: Resource.PLANTS, count: 2},

      metadata: {
        cardNumber: 'T08',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend any number of plants to gain 3 times that amount of M€.', (eb) => {
            eb.text('X').plants(1).startAction.text('3X').megacredits(1);
          });
        }),
        description: 'Requires 2 plant production.',
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.plants > 0;
  }

  public action(player: IPlayer) {
    return new SelectAmount(
      message('Select up to ${0} plants to spend', (b) => b.number(player.plants)),
      'Spend plants', 1, player.plants, false)
      .andThen((amount) => {
        player.stock.deduct(Resource.PLANTS, amount);
        player.stock.add(Resource.MEGACREDITS, amount * 3, {log: true});
        player.game.log('${0} spent ${1} plants for ${2} M€', (b) => b.player(player).number(amount).number(amount * 3));
        return undefined;
      });
  }
}
