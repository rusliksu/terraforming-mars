import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class EnergyShortcut extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.ENERGY_SHORTCUT,
      tags: [Tag.POWER],
      cost: 2,

      metadata: {
        cardNumber: '148',
        renderData: CardRenderer.builder((b) => {
          b.minus().energy(1).nbsp.plus().heat(1).asterix();
        }),
        description: 'Convert all your energy to heat.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.energy > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const amount = player.energy;
    if (amount > 0) {
      player.stock.deduct(Resource.ENERGY, amount);
      player.stock.add(Resource.HEAT, amount, {log: true});
    }
    return undefined;
  }
}
