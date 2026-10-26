import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {CanAffordOptions, IPlayer} from '@/server/IPlayer';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Resource} from '@/common/Resource';

/**
 * Spends 3 different resource types at once, which the declarative `spend` behavior can't
 * express (it only supports paying with one resource type at a time) - so the cost is checked
 * and deducted imperatively, while the TR gain still goes through `behavior`.
 */
export class AsteroidFragmentation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.ASTEROID_FRAGMENTATION,
      tags: [],
      cost: 3,

      behavior: {
        tr: 3,
      },

      metadata: {
        cardNumber: 'CB06',
        renderData: CardRenderer.builder((b) => {
          b.heat(6).nbsp.steel(3, {digit: true}).nbsp.titanium(3, {digit: true}).br;
          b.arrow().tr(3, {digit: true});
        }),
        description: 'Spend 6 heat, 3 steel and 3 titanium to raise your TR 3 steps.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer, _canAffordOptions: CanAffordOptions): boolean {
    return player.heat >= 6 && player.steel >= 3 && player.titanium >= 3;
  }

  public override bespokePlay(player: IPlayer) {
    player.stock.deduct(Resource.HEAT, 6, {log: true});
    player.stock.deduct(Resource.STEEL, 3, {log: true});
    player.stock.deduct(Resource.TITANIUM, 3, {log: true});
    return undefined;
  }
}
