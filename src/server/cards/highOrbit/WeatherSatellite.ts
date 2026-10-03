import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardRenderer} from '../render/CardRenderer';
import {ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SilverCard} from './SilverCard';

/**
 * High Orbit (fan): Weather Satellite. Passive effect -- whenever THIS player raises their own
 * TR (by any amount, from any source), gain 1 M€ per step raised.
 *
 * Hooks into the existing `ICard.onIncreaseTerraformRatingByAnyPlayer` callback, dispatched
 * from `Player.increaseTerraformRating` -- see Player.ts. Same pattern as AnubisSecurities and
 * Greta (both filter on `player === cardOwner` to react only to their own owner's TR gain).
 */
export class WeatherSatellite extends SilverCard implements ICard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.WEATHER_SATELLITE,
      cost: 1,

      metadata: {
        cardNumber: 'HO02',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you raise your TR, gain 1 M€ per step raised.', (eb) => {
            eb.tr(1).startEffect.megacredits(1);
          });
        }),
      },
    });
  }

  public onIncreaseTerraformRatingByAnyPlayer(cardOwner: IPlayer, player: IPlayer, steps: number) {
    if (cardOwner === player && steps > 0) {
      player.stock.add(Resource.MEGACREDITS, steps, {log: true, from: {card: this}});
    }
  }
}
