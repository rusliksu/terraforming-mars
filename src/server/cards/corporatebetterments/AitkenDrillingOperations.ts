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

export class AitkenDrillingOperations extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.AITKEN_DRILLING_OPERATIONS,
      tags: [Tag.SCIENCE, Tag.MOON, Tag.SPACE],
      cost: 31,
      victoryPoints: 2,

      requirements: {tag: Tag.SCIENCE, count: 5},

      behavior: {
        production: {steel: 3},
      },

      metadata: {
        cardNumber: 'CB54',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend any amount of steel and gain that amount of titanium.', (eb) => {
            eb.text('x').steel(1).startAction.text('x').titanium(1);
          }).br;
          b.production((pb) => pb.steel(3));
        }),
        description: 'Requires 5 Science tags. Increase your steel production 3 steps.',
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.steel > 0;
  }

  public action(player: IPlayer) {
    return new SelectAmount('Select amount of steel to spend', 'Spend steel', 1, player.steel)
      .andThen((amount) => {
        player.stock.deduct(Resource.STEEL, amount, {log: true});
        player.stock.add(Resource.TITANIUM, amount, {log: true});
        return undefined;
      });
  }
}
