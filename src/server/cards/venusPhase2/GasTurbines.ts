import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class GasTurbines extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GAS_TURBINES,
      tags: [Tag.POWER, Tag.VENUS],
      cost: 11,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'V75',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(1)).nbsp.venus(1).asterix();
        }),
        description: 'Increase your energy production 1 step for every 10% of Venus reached.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const steps = Math.floor(player.game.getVenusScaleLevel() / 10);
    player.production.add(Resource.ENERGY, steps, {log: true});
    return undefined;
  }
}
