import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectAmount} from '../../inputs/SelectAmount';
import {CardRenderer} from '../render/CardRenderer';

const MAX_CONVERSIONS = 5;
const PLANTS_PER_CONVERSION = 3;

export class GreenAreasIntegration extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.GREEN_AREAS_INTEGRATION,
      tags: [Tag.SPACE],
      cost: 24,
      victoryPoints: 2,

      metadata: {
        cardNumber: 'B20',
        renderData: CardRenderer.builder((b) => {
          b.minus().plants(3).arrow().tr(1).asterix();
        }),
        description: 'Spend 3 plants to increase your TR 1 step. You may do this up to 5 times.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const max = Math.min(MAX_CONVERSIONS, Math.floor(player.plants / PLANTS_PER_CONVERSION));
    if (max <= 0) {
      return undefined;
    }

    return new SelectAmount(
      'Select how many times to spend 3 plants to raise TR 1 step (up to 5)',
      'Confirm',
      0,
      max)
      .andThen((amount) => {
        if (amount > 0) {
          player.stock.deduct(Resource.PLANTS, amount * PLANTS_PER_CONVERSION, {log: true});
          player.increaseTerraformRating(amount, {log: true});
        }
        return undefined;
      });
  }
}
