import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectAmount} from '../../inputs/SelectAmount';
import {message} from '../../logs/MessageBuilder';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ChipFabricationPlant extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.CHIP_FABRICATION_PLANT,
      tags: [Tag.EARTH, Tag.BUILDING],
      cost: 15,

      requirements: {tag: Tag.PLANT, count: 1, max: true},

      metadata: {
        cardNumber: 'X40',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend any number of energy to gain the same amount of steel.', (ab) => {
            ab.text('X').energy(1).startAction.text('X').steel(1);
          });
        }),
        description: 'Requires that you have no more than 1 plant tag.',
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.availableEnergy() > 0;
  }

  public action(player: IPlayer) {
    return new SelectAmount(
      message('Select up to ${0} energy to convert to steel', (b) => b.number(player.availableEnergy())),
      'Convert energy', 1, player.availableEnergy(), false)
      .andThen((amount) => {
        return player.spendEnergy(amount, () => {
          player.stock.add(Resource.STEEL, amount);
          player.game.log('${0} converted ${1} energy to steel', (b) => b.player(player).number(amount));
          return undefined;
        });
      });
  }
}
