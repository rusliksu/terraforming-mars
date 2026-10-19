import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Resource} from '@/common/Resource';
import {IPlayer} from '@/server/IPlayer';
import {Card} from '@/server/cards/Card';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all, digit} from '@/server/cards/Options';
import {Size} from '@/common/cards/render/Size';
import {OrOptions} from '@/server/inputs/OrOptions';
import {SelectOption} from '@/server/inputs/SelectOption';
import {message} from '@/server/logs/MessageBuilder';

export class SabotageRebalanced extends Card {
  public readonly isAttackCard = true;

  constructor() {
    super({
      name: CardName.SABOTAGE_REBALANCED,
      type: CardType.EVENT,
      cost: 1,
      requirements: {generation: 5},
      metadata: {
        cardNumber: '121',
        description: 'Remove up to 3 titanium from any player, or 4 steel, or 7 M€.',
        renderData: CardRenderer.builder((b) => {
          b.minus().titanium(3, {all, digit}).nbsp.or(Size.SMALL).nbsp;
          b.minus().steel(4, {all, digit}).br.or(Size.SMALL).nbsp;
          b.minus().megacredits(7, {all});
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    if (player.game.isSoloMode()) {
      return undefined;
    }
    const options = new OrOptions();
    for (const target of player.opponents) {
      for (const [resource, maximum] of [[Resource.TITANIUM, 3], [Resource.STEEL, 4], [Resource.MEGACREDITS, 7]] as const) {
        if (target.stock[resource] <= 0 || target.isProtected(resource)) {
          continue;
        }
        const amount = Math.min(maximum, target.stock[resource]);
        const title = message('Remove ${0} ${1} from ${2}', (b) => b.number(amount).string(resource).player(target));
        options.options.push(new SelectOption(title).andThen(() => {
          target.attack(player, resource, maximum, {log: true});
          return undefined;
        }));
      }
    }
    if (options.options.length === 0) {
      return undefined;
    }
    options.options.push(new SelectOption('Do not remove resource'));
    return options;
  }
}
