import {ConditionalDiscountModel} from '../../common/models/ConditionalDiscountModel';
import {IPlayer} from '../IPlayer';
import {Birds} from '../cards/base/Birds';
import {Asteroid} from '../cards/base/Asteroid';
import {CuttingEdgeTechnology} from '../cards/promo/CuttingEdgeTechnology';
import {Xavier} from '../cards/ceos/Xavier';
import {AdhaiHighOrbitConstructions} from '../cards/pathfinders/AdhaiHighOrbitConstructions';

// Fixed real cards, independent of private hands. The whitelisted discount methods only read them.
const REQUIREMENTS_CARD = new Birds();
const SPACE_CARD = new Asteroid();

export function publicConditionalDiscounts(player: IPlayer): Array<ConditionalDiscountModel> {
  const discounts: Array<ConditionalDiscountModel> = [];
  for (const source of player.tableau) {
    const condition = source instanceof CuttingEdgeTechnology || source instanceof Xavier ? 'requirements' :
      source instanceof AdhaiHighOrbitConstructions ? 'spaceWithoutPlanetaryTags' : undefined;
    if (condition === undefined) {
      continue;
    }
    const target = condition === 'requirements' ? REQUIREMENTS_CARD : SPACE_CARD;
    const amount = source.getCardDiscount?.(player, target) ?? 0;
    if (amount > 0) {
      discounts.push({source: source.name, amount, condition});
    }
  }
  return discounts;
}
