import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class PureEnergy extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.PURE_ENERGY,
      tags: [Tag.POWER],
      cost: 35,
      victoryPoints: 1,

      behavior: {
        production: {energy: 7},
      },

      metadata: {
        cardNumber: 'T27',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(-1).slash().energy(1).plus().tag(Tag.POWER).plus().production((pb) => pb.energy(1)).br;
          b.production((pb) => pb.energy(7));
        }),
        description: 'This card costs 1 M€ less for each energy resource, Power tag, and energy production you have.',
      },
    });
  }

  public override getOwnCostReduction(player: IPlayer): number {
    return player.energy + player.tags.count(Tag.POWER) + player.production.energy;
  }
}
