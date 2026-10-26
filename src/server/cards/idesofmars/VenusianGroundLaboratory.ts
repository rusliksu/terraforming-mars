import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectAmount} from '../../inputs/SelectAmount';
import {CardRenderer} from '../render/CardRenderer';

export class VenusianGroundLaboratory extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_GROUND_LABORATORY,
      tags: [Tag.VENUS, Tag.BUILDING],
      cost: 8,
      victoryPoints: 1,

      requirements: {venus: 8},

      behavior: {
        production: {megacredits: 1},
      },

      metadata: {
        cardNumber: '143',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend an equal amount of M€ and steel to gain that much titanium.', (eb) => {
            eb.text('x').megacredits(1).text('x').steel(1).startAction.text('x').titanium(1);
          }).br;
          b.production((pb) => pb.megacredits(1));
        }),
        description: 'Requires 8% Venus. Increase your M€ production 1 step.',
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.megaCredits > 0 && player.steel > 0;
  }

  public action(player: IPlayer) {
    const max = Math.min(player.megaCredits, player.steel);
    return new SelectAmount('Select amount of M€ and steel to spend', 'Spend', 1, max)
      .andThen((amount) => {
        player.stock.deduct(Resource.MEGACREDITS, amount, {log: true});
        player.stock.deduct(Resource.STEEL, amount, {log: true});
        player.stock.add(Resource.TITANIUM, amount, {log: true});
        return undefined;
      });
  }
}
