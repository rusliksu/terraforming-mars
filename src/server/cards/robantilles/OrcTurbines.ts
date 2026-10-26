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

const MAX_CONVERSIONS_PER_USE = 5;
const HEAT_PER_CONVERSION = 2;

export class OrcTurbines extends Card implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ORC_TURBINES,
      tags: [Tag.POWER],
      cost: 4,

      metadata: {
        cardNumber: 'H05',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 heat to gain 1 energy. Do this up to 5 times.', (eb) => {
            eb.heat(2).startAction.energy(1);
          });
          b.br;
          b.effect('Every time you decrease your Energy production, you may decrease your Heat ' +
            'production by 2 instead.', (eb) => {
            eb.minus().energy(1).startEffect.minus().heat(2);
          });
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.availableHeat() >= HEAT_PER_CONVERSION;
  }

  public action(player: IPlayer) {
    const max = Math.min(MAX_CONVERSIONS_PER_USE, Math.floor(player.availableHeat() / HEAT_PER_CONVERSION));
    if (max <= 0) {
      return undefined;
    }
    return new SelectAmount(
      'Select how many times to spend 2 heat to gain 1 energy (max 5)',
      'Confirm',
      1,
      max)
      .andThen((amount) => {
        return player.spendHeat(amount * HEAT_PER_CONVERSION, () => {
          player.stock.add(Resource.ENERGY, amount, {log: true});
          return undefined;
        });
      });
  }
}
