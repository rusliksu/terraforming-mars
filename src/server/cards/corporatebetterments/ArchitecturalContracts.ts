import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {IStandardProjectCard} from '@/server/cards/IStandardProjectCard';

/** A passive discount on city tiles, patterned after Prefabrication of Human Habitats. */
export class ArchitecturalContracts extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ARCHITECTURAL_CONTRACTS,
      tags: [Tag.BUILDING],
      cost: 22,
      victoryPoints: 2,

      requirements: {cities: 1},
      cardDiscount: {tag: Tag.CITY, amount: 3},

      metadata: {
        cardNumber: 'CB02',
        renderData: CardRenderer.builder((b) => {
          b.effect('Cards with a city tag cost 3 M€ less.', (eb) => {
            eb.tag(Tag.CITY).startEffect.megacredits(-3);
          });
          b.br;
          b.effect('The City standard project costs 3 M€ less.', (eb) => {
            eb.city().startEffect.megacredits(-3);
          });
        }),
        description: 'Requires that you own a city tile.',
      },
    });
  }

  public getStandardProjectDiscount(_player: IPlayer, card: IStandardProjectCard): number {
    if (card.name === CardName.CITY_STANDARD_PROJECT) {
      return 3;
    }
    return 0;
  }
}
