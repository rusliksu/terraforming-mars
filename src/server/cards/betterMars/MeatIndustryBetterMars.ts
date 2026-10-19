import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {MeatIndustry} from '../promo/MeatIndustry';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';

/** Meat Industry, with an added Animal tag, 3 M€ cheaper, and only 1 M€ per animal (was 2). */
export class MeatIndustryBetterMars extends MeatIndustry {
  public override get name() {
    return CardName.MEAT_INDUSTRY_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.ANIMAL];
  }

  public override get cost() {
    return super.cost - 3;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      cardNumber: 'X77',
      renderData: CardRenderer.builder((b) => {
        b.effect('When you gain an animal to ANY CARD, gain 1 M€.', (eb) => {
          eb.resource(CardResource.ANIMAL).asterix().startEffect.megacredits(1);
        });
      }),
    };
  }

  // Overridden rather than inherited (unlike other BetterMars variants) since the gain
  // per animal is halved, not just the cost/tags.
  public override onResourceAdded(player: IPlayer, card: ICard, count: number) {
    if (card.resourceType === CardResource.ANIMAL) {
      player.stock.add(Resource.MEGACREDITS, count, {log: true});
    }
  }
}
