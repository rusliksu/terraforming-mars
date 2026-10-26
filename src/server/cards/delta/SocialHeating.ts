import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {all} from '../Options';

export class SocialHeating extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SOCIAL_HEATING,
      cost: 12,

      requirements: {cities: 1},

      metadata: {
        cardNumber: 'DP10',
        renderData: CardRenderer.builder((b) => {
          b.effect('Any time any player moves on the Delta Project track, gain heat equal to the number of steps taken.', (eb) => {
            eb.plate('Delta track', {all}).startEffect.heat(1);
          });
        }),
        description: 'Requires that you have a city in play.',
      },
    });
  }

  public onDeltaTrackMoved(cardOwner: IPlayer, _mover: IPlayer, steps: number, _forward: boolean) {
    cardOwner.stock.add(Resource.HEAT, steps, {log: true, from: {card: this}});
  }
}
