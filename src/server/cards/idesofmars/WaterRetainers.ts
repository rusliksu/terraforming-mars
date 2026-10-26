import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class WaterRetainers extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.WATER_RETAINERS,
      tags: [Tag.SCIENCE],
      cost: 19,

      behavior: {
        production: {plants: 1},
      },

      metadata: {
        cardNumber: 'I56',
        renderData: CardRenderer.builder((b) => {
          b.effect('Cards and actions that place a greenery tile cost 2 M€ less.', (eb) => {
            eb.greenery().startEffect.megacredits(-2);
          });
          b.br;
          b.effect('Cards and actions that place an ocean tile cost 3 M€ less.', (eb) => {
            eb.oceans(1).startEffect.megacredits(-3);
          });
          b.br;
          b.production((pb) => pb.plants(1));
        }),
        description: 'Increase your plant production 1 step.',
      },
    });
  }

  // Covers the common declarative `behavior.greenery`/`behavior.ocean` cards (including
  // this expansion's own tile-placing cards) and both matching standard projects. Cards
  // that place these tiles through bespoke code only are not detected.
  public override getCardDiscount(_player: IPlayer, card: IProjectCard): number {
    let discount = 0;
    if (card.behavior?.greenery !== undefined) {
      discount += 2;
    }
    if (card.behavior?.ocean !== undefined) {
      discount += 3;
    }
    return discount;
  }

  public getStandardProjectDiscount(_player: IPlayer, standardProject: IStandardProjectCard): number {
    if (standardProject.name === CardName.GREENERY_STANDARD_PROJECT) {
      return 2;
    }
    if (standardProject.name === CardName.AQUIFER_STANDARD_PROJECT) {
      return 3;
    }
    return 0;
  }
}
