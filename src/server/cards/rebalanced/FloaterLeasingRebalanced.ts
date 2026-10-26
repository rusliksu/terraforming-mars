import {Card} from '@/server/cards/Card';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {IPlayer} from '@/server/IPlayer';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardResource} from '@/common/CardResource';
import {Units} from '@/common/Units';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {digit} from '@/server/cards/Options';

export class FloaterLeasingRebalanced extends Card implements IProjectCard {
  public readonly hasFloaterIcon = true;

  constructor() {
    super({
      cost: 3,
      name: CardName.FLOATER_LEASING_REBALANCED,
      type: CardType.AUTOMATED,
      metadata: {
        cardNumber: 'C10',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1)).slash().resource(CardResource.FLOATER, {amount: 2, digit});
        }),
        description: 'Increase your M€ production 1 step PER 2 floaters you have (max 10 production).',
      },
    });
  }

  public productionBox(player: IPlayer): Units {
    return Units.of({megacredits: Math.min(Math.floor(player.getResourceCount(CardResource.FLOATER) / 2), 10)});
  }

  public override bespokePlay(player: IPlayer) {
    player.production.adjust(this.productionBox(player), {log: true});
    return undefined;
  }
}
