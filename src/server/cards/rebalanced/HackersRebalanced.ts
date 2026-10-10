import {Card} from '@/server/cards/Card';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {IPlayer} from '@/server/IPlayer';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {Resource} from '@/common/Resource';
import {Units} from '@/common/Units';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';

export class HackersRebalanced extends Card implements IProjectCard {
  public readonly isAttackCard = true;

  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.HACKERS_REBALANCED,
      cost: 3,
      victoryPoints: -1,
      metadata: {
        cardNumber: '125',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().energy(1).megacredits(1, {all}).br;
            pb.plus().megacredits(3);
          });
        }),
        description: 'Decrease your energy production 1 step and EACH OPPONENT\'S M€ production 1 step. Increase your M€ production 3 steps.',
      },
    });
  }

  public productionBox(_player: IPlayer): Units {
    return Units.of({megacredits: 3, energy: -1});
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.production.canAdjust(this.productionBox(player));
  }

  public override bespokePlay(player: IPlayer) {
    const targets = player.opponents.filter((p) => p.canHaveProductionReduced(Resource.MEGACREDITS, 1, player));
    const attackNext = (): void => {
      const target = targets.shift();
      if (target === undefined) {
        player.production.adjust(this.productionBox(player), {log: true});
        return;
      }
      target.maybeBlockAttack(player, 'Lose 1 M€ production', (proceed) => {
        if (proceed) {
          target.production.add(Resource.MEGACREDITS, -1, {log: true, from: {player}});
        }
        attackNext();
        return undefined;
      });
    };
    attackNext();
    return undefined;
  }
}
