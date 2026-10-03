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

export class MercurialLaboratory extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MERCURIAL_LABORATORY,
      tags: [Tag.POWER, Tag.SPACE],
      cost: 8,
      victoryPoints: 1,

      behavior: {
        production: {energy: -1},
      },

      metadata: {
        cardNumber: 'I54',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend X M€ and X titanium to gain X steel and X energy.', (eb) => {
            eb.text('x').megacredits(1).nbsp.text('x').titanium(1)
              .startAction.text('x').steel(1).nbsp.text('x').energy(1);
          });
          b.br;
          b.production((pb) => pb.energy(-1));
        }),
        description: 'Decrease your energy production 1 step.',
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.megaCredits > 0 && player.titanium > 0;
  }

  public action(player: IPlayer) {
    const maxAmount = Math.min(player.megaCredits, player.titanium);
    return new SelectAmount('Select amount of M€ and titanium to spend', 'Spend', 1, maxAmount)
      .andThen((amount) => {
        player.stock.deduct(Resource.MEGACREDITS, amount, {log: true});
        player.stock.deduct(Resource.TITANIUM, amount, {log: true});
        player.stock.add(Resource.STEEL, amount, {log: true});
        player.stock.add(Resource.ENERGY, amount, {log: true});
        return undefined;
      });
  }
}
